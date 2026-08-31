import mongoose from 'mongoose';
import Chunk, { IChunk } from '../models/Chunk';
import { embedText } from './ingestion.service';

const TOP_K = parseInt(process.env.TOP_K || '15', 10);
const RELEVANCE_THRESHOLD = parseFloat(process.env.RELEVANCE_THRESHOLD || '0.40');
const VECTOR_SEARCH_INDEX = 'chunk_embeddings'; // Must match the Atlas index name

export interface RetrievedChunk {
  chunk: IChunk;
  score: number;
  documentTitle?: string;
}

/**
 * Embeds the query and runs Atlas Vector Search to find the top-k most relevant chunks.
 * Only returns chunks with a score >= RELEVANCE_THRESHOLD.
 */
export async function retrieveRelevantChunks(
  query: string
): Promise<RetrievedChunk[]> {
  // Embed the query
  const queryEmbedding = await embedText(query);

  // Atlas Vector Search aggregation pipeline
  const pipeline: mongoose.PipelineStage[] = [
    {
      $vectorSearch: {
        index: VECTOR_SEARCH_INDEX,
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: TOP_K * 15, // examine many more candidates for better recall
        limit: TOP_K,
      },
    } as mongoose.PipelineStage,
    {
      $addFields: {
        score: { $meta: 'vectorSearchScore' },
      },
    },
    // Join document title for citation building
    {
      $lookup: {
        from: 'documents',
        localField: 'documentId',
        foreignField: '_id',
        as: 'document',
      },
    },
    {
      $unwind: {
        path: '$document',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $match: {
        score: { $gte: RELEVANCE_THRESHOLD },
        'document.status': 'ingested', // only from fully-ingested documents
      },
    },
  ];

  const results = await Chunk.aggregate(pipeline);

  return results.map((r) => ({
    chunk: r as IChunk,
    score: r.score as number,
    documentTitle: r.document?.title as string | undefined,
  }));
}
