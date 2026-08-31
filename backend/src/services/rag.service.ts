import OpenAI from 'openai';
import { RetrievedChunk } from './retrieval.service';
import { ICitation } from '../models/Message';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://college-rag-chatbot.app',
    'X-Title': 'College RAG Chatbot',
  },
});

const LLM_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/auto';

const SYSTEM_PROMPT = `You are a helpful college information assistant. Your job is to answer students' questions using ONLY the information provided in the context below.

STRICT RULES:
1. Answer ONLY using the provided context. Do not use any outside knowledge.
2. If the context does not contain enough information to answer the question, say exactly: "I couldn't find information about that in the college's documents. Please contact the college administration for assistance."
3. Be concise, accurate, and helpful.
4. When citing information, refer to it naturally (e.g., "According to the Faculty Information document...").
5. Do not speculate, guess, or make up information.
6. IMPORTANT: When the question asks to "list all" or "show all" items (faculty, courses, etc.), you MUST scan every source block in the context and include EVERY matching item. Never stop after the first few — list ALL of them without exception. Do not say the document is cut off if more entries exist in later source blocks.
7. FORMATTING: Do NOT use any markdown formatting. No asterisks (**bold**), no underscores (_italic_), no hashes (# headings), no backticks, no bullet dashes. Write in plain, clean prose or use simple numbered lists (1. 2. 3.) when listing items. Your response will be displayed as plain text.`;

export interface RAGResult {
  answer: string;
  citations: ICitation[];
  abstained: boolean;
}

/**
 * Assembles retrieved chunks into context, calls the LLM, and returns the answer with citations.
 */
export async function generateAnswer(
  query: string,
  retrievedChunks: RetrievedChunk[],
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<RAGResult> {
  // If no chunks passed the threshold, abstain immediately (no LLM call)
  if (retrievedChunks.length === 0) {
    return {
      answer:
        "I couldn't find information about that in the college's documents. Please contact the college administration for assistance.",
      citations: [],
      abstained: true,
    };
  }

  // Assemble context block with numbered sources
  const contextBlock = retrievedChunks
    .map(
      (r, i) =>
        `[Source ${i + 1}: ${r.documentTitle ?? 'Unknown Document'}]\n${r.chunk.text}`
    )
    .join('\n\n---\n\n');

  // Build messages array with last 2-3 turns of history for context
  const historyWindow = conversationHistory.slice(-6); // 3 user + 3 assistant turns

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'user' as const,
      content: `CONTEXT:\n${contextBlock}\n\nAnswer the following question using ONLY the context above. If the context doesn't contain enough information, say you couldn't find it.\n\nQuestion: ${query}`,
    },
  ];

  // Prepend history if available
  if (historyWindow.length > 0) {
    messages.unshift(
      ...historyWindow.map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      }))
    );
  }

  const response = await openai.chat.completions.create({
    model: LLM_MODEL,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    max_tokens: 4096, // raised so full faculty lists / large tables aren't truncated
    temperature: 0.1, // low temperature for factual grounded answers
  });

  const answerText =
    response.choices[0]?.message?.content?.trim() ??
    "I couldn't find information about that in the college's documents.";

  // Check if the LLM abstained
  const abstained =
    answerText.toLowerCase().includes("couldn't find information") ||
    answerText.toLowerCase().includes("i don't have information");

  // Build citations — deduplicate by documentId so each source document
  // appears only once, using the highest-ranked chunk as the snippet.
  const seenDocIds = new Set<string>();
  const citations: ICitation[] = [];
  for (const r of retrievedChunks) {
    const docId = r.chunk.documentId.toString();
    if (seenDocIds.has(docId)) continue;
    seenDocIds.add(docId);
    citations.push({
      documentId: r.chunk.documentId,
      documentTitle: r.documentTitle ?? 'Unknown Document',
      chunkId: r.chunk._id as import('mongoose').Types.ObjectId,
      snippet: r.chunk.text.slice(0, 200) + (r.chunk.text.length > 200 ? '…' : ''),
    });
  }

  return { answer: answerText, citations, abstained };
}
