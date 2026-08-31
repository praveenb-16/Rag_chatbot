import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import OpenAI from 'openai';
import CollegeDocument from '../models/Document';
import Chunk from '../models/Chunk';
import mongoose from 'mongoose';

// OpenAI-compatible client pointing to OpenRouter
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://college-rag-chatbot.app',
    'X-Title': 'College RAG Chatbot',
  },
});

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'openai/text-embedding-3-small';
// Vision model for OCR – gpt-4o-mini is cheap and accurate for text in images
const VISION_MODEL = process.env.VISION_MODEL || 'openai/gpt-4o-mini';

// ~1000 tokens ≈ 4000 characters, ~100 token overlap ≈ 400 characters
// Larger chunks keep related content (e.g. a full faculty profile) together
const CHUNK_SIZE = 4000;
const CHUNK_OVERLAP = 400;

// Map of DOCX media file extensions → base64 data-URL mime types
const IMAGE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
  tiff: 'image/tiff',
  tif: 'image/tiff',
};

/**
 * Splits plain text into overlapping chunks of approximately CHUNK_SIZE characters.
 * Tries to break at sentence/paragraph boundaries for readability.
 */
function chunkText(text: string): string[] {
  const chunks: string[] = [];
  // Normalize whitespace
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + CHUNK_SIZE, normalized.length);

    // Try to end at a sentence boundary (period + space or newline)
    if (end < normalized.length) {
      const boundary = normalized.lastIndexOf('. ', end);
      if (boundary > start + CHUNK_SIZE / 2) {
        end = boundary + 2; // include '. '
      } else {
        const nlBoundary = normalized.lastIndexOf('\n', end);
        if (nlBoundary > start + CHUNK_SIZE / 2) {
          end = nlBoundary + 1;
        }
      }
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    if (end >= normalized.length) break;
    start = end - CHUNK_OVERLAP;
    if (start < 0) start = 0;
  }

  return chunks;
}

/**
 * Embeds a single text string using the embedding model via OpenRouter.
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000), // safety cap
  });
  return response.data[0].embedding;
}

/**
 * Embeds an array of texts in batches of 20 to avoid rate limits.
 */
async function embedBatch(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 20;
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch.map((t) => t.slice(0, 8000)),
    });
    // API returns embeddings in order
    embeddings.push(...response.data.map((d) => d.embedding));
  }

  return embeddings;
}

/**
 * Extracts all image files embedded inside a DOCX (ZIP archive).
 * Returns an array of { mimeType, base64 } objects ready for Vision API calls.
 */
async function extractImagesFromDocx(
  buffer: Buffer
): Promise<Array<{ mimeType: string; base64: string }>> {
  const zip = await JSZip.loadAsync(buffer);
  const images: Array<{ mimeType: string; base64: string }> = [];

  const mediaFolder = zip.folder('word/media');
  if (!mediaFolder) return images;

  const filePromises: Promise<void>[] = [];

  zip.folder('word/media')?.forEach((relativePath, file) => {
    if (file.dir) return;

    const ext = relativePath.split('.').pop()?.toLowerCase() ?? '';
    const mime = IMAGE_MIME[ext];
    if (!mime) return; // skip non-image files (e.g. .emf, .wmf vector formats)

    filePromises.push(
      file.async('base64').then((base64) => {
        images.push({ mimeType: mime, base64 });
      })
    );
  });

  await Promise.all(filePromises);
  return images;
}

/**
 * Sends a single image to the Vision LLM and returns the extracted text.
 * Uses GPT-4o-mini via OpenRouter — cheap and accurate for OCR tasks.
 */
async function ocrImage(mimeType: string, base64: string): Promise<string> {
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const response = await openai.chat.completions.create({
    model: VISION_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: dataUrl,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: `You are an OCR assistant. Extract ALL text from this image exactly as it appears.
- Preserve names, numbers, designations, departments, and any structured data (tables, lists).
- If the image contains a table, output it row by row, separating columns with " | ".
- Do not add commentary, just return the extracted text.`,
          },
        ],
      },
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? '';
}

/**
 * Main ingestion pipeline:
 * 1. Extract text from document (PDF/TXT/DOCX)
 *    - For DOCX: also extract embedded images and OCR them via Vision LLM
 * 2. Split into chunks
 * 3. Embed each chunk via OpenRouter
 * 4. Store Chunk documents in MongoDB
 * 5. Update Document status to 'ingested' or 'failed'
 */
export async function ingestDocument(
  documentId: mongoose.Types.ObjectId,
  fileBuffer: Buffer,
  mimeType: string
): Promise<void> {
  let text = '';

  try {
    // Step 1: Extract text
    if (mimeType === 'application/pdf') {
      // Stage A: try fast text-layer extraction first
      const parsed = await pdfParse(fileBuffer);
      text = parsed.text?.trim() ?? '';

      // Stage B: if text is too short (scanned/image PDF), fall back to Vision OCR
      if (text.length < 100) {
        console.log(`📄 PDF text layer too short (${text.length} chars) — trying Vision OCR fallback...`);
        try {
          const base64Pdf = fileBuffer.toString('base64');
          const ocrResponse = await openai.chat.completions.create({
            model: VISION_MODEL,
            max_tokens: 4096,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text' as const,
                    text: `You are an OCR assistant. Extract ALL text from this PDF document exactly as it appears.\n- Preserve names, numbers, designations, departments, and any structured data (tables, lists).\n- If it contains tables, output them row by row, separating columns with " | ".\n- Do not add commentary, just return all extracted text.`,
                  },
                  {
                    type: 'image_url' as const,
                    image_url: {
                      url: `data:application/pdf;base64,${base64Pdf}`,
                      detail: 'high' as const,
                    },
                  },
                ] as OpenAI.Chat.ChatCompletionContentPart[],
              },
            ],
          });
          const ocrText = ocrResponse.choices[0]?.message?.content?.trim() ?? '';
          if (ocrText.length > text.length) {
            text = ocrText;
            console.log(`  ✅ Vision OCR extracted ${text.length} chars from PDF`);
          }
        } catch (ocrErr) {
          console.warn(`  ⚠️  Vision OCR fallback failed:`, (ocrErr as Error).message);
        }
      }
    } else if (mimeType === 'text/plain') {
      text = fileBuffer.toString('utf-8');
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      // Stage A: Extract any real text paragraphs/tables via mammoth
      const mammothResult = await mammoth.extractRawText({ buffer: fileBuffer });
      const mammothText = mammothResult.value.trim();
      if (mammothText) {
        console.log(`📝 Mammoth extracted ${mammothText.length} chars of real text`);
      }

      // Stage B: Extract embedded images from the DOCX ZIP and OCR each one
      const images = await extractImagesFromDocx(fileBuffer);
      console.log(`🖼️  Found ${images.length} embedded image(s) in DOCX — running OCR...`);

      const ocrTexts: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const { mimeType: imgMime, base64 } = images[i];
        try {
          const extracted = await ocrImage(imgMime, base64);
          if (extracted.trim()) {
            ocrTexts.push(extracted.trim());
            console.log(`  ✅ Image ${i + 1}/${images.length} OCR: ${extracted.length} chars`);
          } else {
            console.log(`  ⚠️  Image ${i + 1}/${images.length} returned no text`);
          }
        } catch (ocrErr) {
          console.warn(`  ❌ OCR failed for image ${i + 1}:`, ocrErr);
        }
      }

      // Merge real text + OCR text
      const allParts = [mammothText, ...ocrTexts].filter(Boolean);
      text = allParts.join('\n\n');
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the document');
    }

    // Step 2: Chunk
    const rawChunks = chunkText(text);
    if (rawChunks.length === 0) {
      throw new Error('Chunking produced no output');
    }

    // Step 3: Embed all chunks
    const embeddings = await embedBatch(rawChunks);

    // Step 4: Insert chunks into MongoDB
    const chunkDocs = rawChunks.map((chunkText, index) => ({
      documentId,
      chunkIndex: index,
      text: chunkText,
      embedding: embeddings[index],
    }));

    await Chunk.insertMany(chunkDocs);

    // Step 5: Mark document as ingested
    await CollegeDocument.findByIdAndUpdate(documentId, {
      status: 'ingested',
      chunkCount: chunkDocs.length,
    });

    console.log(`✅ Ingested document ${documentId}: ${chunkDocs.length} chunks`);
  } catch (err) {
    console.error(`❌ Ingestion failed for document ${documentId}:`, err);

    // Clean up any partially-inserted chunks before marking failed
    await Chunk.deleteMany({ documentId });

    await CollegeDocument.findByIdAndUpdate(documentId, {
      status: 'failed',
      chunkCount: 0,
    });
  }
}
