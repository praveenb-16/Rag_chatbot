import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Session from '../models/Session';
import Message from '../models/Message';
import { retrieveRelevantChunks } from '../services/retrieval.service';
import { generateAnswer } from '../services/rag.service';

export async function createSession(req: Request, res: Response): Promise<void> {
  try {
    const session = await Session.create({
      userId: req.user!._id,
      title: 'New Chat',
    });
    res.status(201).json({ session });
  } catch {
    res.status(500).json({ error: 'Failed to create session' });
  }
}

export async function listSessions(req: Request, res: Response): Promise<void> {
  try {
    const sessions = await Session.find({ userId: req.user!._id }).sort({
      updatedAt: -1,
    });
    res.json({ sessions });
  } catch {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
}

export async function getSession(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid session ID' });
      return;
    }

    const session = await Session.findOne({
      _id: id,
      userId: req.user!._id, // enforce ownership — sessions never leak across users
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const messages = await Message.find({ sessionId: id }).sort({ createdAt: 1 });
    res.json({ session, messages });
  } catch {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
}

export async function deleteSession(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid session ID' });
      return;
    }

    const session = await Session.findOne({ _id: id, userId: req.user!._id });
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Cascade: delete all messages in this session
    await Message.deleteMany({ sessionId: id });
    await session.deleteOne();

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete session' });
  }
}

export async function postMessage(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid session ID' });
      return;
    }

    const { query } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({ error: 'Query is required and must not be empty' });
      return;
    }

    const session = await Session.findOne({ _id: id, userId: req.user!._id });
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Save user message
    const userMessage = await Message.create({
      sessionId: id,
      role: 'user',
      content: query.trim(),
      citations: [],
      abstained: false,
    });

    // Update session title from first query
    if (session.title === 'New Chat') {
      session.title =
        query.trim().slice(0, 60) + (query.trim().length > 60 ? '…' : '');
      session.updatedAt = new Date();
      await session.save();
    } else {
      session.updatedAt = new Date();
      await session.save();
    }

    // Load recent conversation history for context (last 3 turns)
    const recentMessages = await Message.find({ sessionId: id })
      .sort({ createdAt: -1 })
      .limit(7); // 3 turns = 6 messages + the one we just saved

    const history = recentMessages
      .reverse()
      .filter((m) => m._id.toString() !== userMessage._id.toString()) // exclude current
      .map((m) => ({ role: m.role, content: m.content }));

    // RAG Pipeline with streaming
    const retrievedChunks = await retrieveRelevantChunks(query.trim());
    
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    // Send initial metadata (citations) so frontend can show them immediately
    // We don't have citations perfectly built yet because generateAnswer builds them.
    // Actually, generateAnswer builds citations synchronously from retrievedChunks. 
    // We can just let generateAnswer run, and we'll send the tokens.
    // Wait, generateAnswer needs to run, we can't send citations until it returns them.
    // But we can send the token events inside the callback.
    let isFirstToken = true;

    const { answer, citations, abstained } = await generateAnswer(
      query.trim(),
      retrievedChunks,
      history,
      (token) => {
        // Just send the token
        res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
      }
    );

    // Save assistant message
    const assistantMessage = await Message.create({
      sessionId: id,
      role: 'assistant',
      content: answer,
      citations,
      abstained,
    });

    // Send final message object with citations
    res.write(`data: ${JSON.stringify({ type: 'done', message: assistantMessage })}\n\n`);
    res.end();
  } catch (err) {
    console.error('postMessage error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process your query. Please try again.' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to process your query.' })}\n\n`);
      res.end();
    }
  }
}
