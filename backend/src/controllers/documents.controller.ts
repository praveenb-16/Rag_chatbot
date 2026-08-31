import { Request, Response } from 'express';
import CollegeDocument from '../models/Document';
import Chunk from '../models/Chunk';
import { ingestDocument } from '../services/ingestion.service';
import { scrapeWebsite } from '../services/scraping.service';
import mongoose from 'mongoose';

export async function listDocuments(_req: Request, res: Response): Promise<void> {
  try {
    const documents = await CollegeDocument.find()
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name email');
    res.json({ documents });
  } catch {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
}

export async function uploadDocument(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { title, department } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'Document title is required' });
      return;
    }

    const doc = await CollegeDocument.create({
      title: title.trim(),
      originalFilename: req.file.originalname,
      department: department?.trim() || null,
      uploadedBy: req.user!._id,
      status: 'processing',
    });

    // Return 202 immediately, run ingestion in background
    res.status(202).json({ document: doc });

    // Background ingestion (non-blocking)
    setImmediate(() => {
      ingestDocument(
        doc._id as mongoose.Types.ObjectId,
        req.file!.buffer,
        req.file!.mimetype
      ).catch((err) => console.error('Background ingestion error:', err));
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload document' });
  }
}

export async function updateDocument(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    const doc = await CollegeDocument.findById(id);
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const { title, department } = req.body;
    if (title) doc.title = title.trim();
    if (department !== undefined) doc.department = department?.trim() || null;

    // If a new file was provided, re-ingest
    if (req.file) {
      // Delete existing chunks first
      await Chunk.deleteMany({ documentId: doc._id });
      doc.status = 'processing';
      doc.chunkCount = 0;
      await doc.save();

      res.json({ document: doc });

      // Background re-ingestion
      setImmediate(() => {
        ingestDocument(
          doc._id as mongoose.Types.ObjectId,
          req.file!.buffer,
          req.file!.mimetype
        ).catch((err) => console.error('Re-ingestion error:', err));
      });
    } else {
      await doc.save();
      res.json({ document: doc });
    }
  } catch {
    res.status(500).json({ error: 'Failed to update document' });
  }
}

export async function deleteDocument(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    const doc = await CollegeDocument.findById(id);
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Delete all associated chunks first (no orphaned chunks)
    await Chunk.deleteMany({ documentId: doc._id });
    await doc.deleteOne();

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete document' });
  }
}

/**
 * POST /api/documents/scrape
 * Body: { url: string, title?: string }
 * Crawls the given website URL and ingests the text into the knowledge base.
 */
export async function scrapeUrl(req: Request, res: Response): Promise<void> {
  try {
    const { url, title } = req.body as { url?: string; title?: string };

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      res.status(400).json({ error: 'A valid URL is required' });
      return;
    }

    // Basic URL validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.trim());
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        res.status(400).json({ error: 'URL must start with http:// or https://' });
        return;
      }
    } catch {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    const siteTitle = (title?.trim()) || `Website: ${parsedUrl.hostname}`;

    // Return 202 immediately; crawl runs in background
    res.status(202).json({
      message: 'Crawl started. The website is being processed and will appear in your knowledge base shortly.',
      url: parsedUrl.href,
      title: siteTitle,
    });

    // Background crawl (non-blocking)
    setImmediate(() => {
      scrapeWebsite(parsedUrl.href, siteTitle, req.user!._id as mongoose.Types.ObjectId)
        .then(result => console.log(`✅ Scrape complete: ${result.pagesScraped} pages → doc ${result.documentId}`))
        .catch(err => console.error('Background scrape error:', err));
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start website crawl' });
  }
}
