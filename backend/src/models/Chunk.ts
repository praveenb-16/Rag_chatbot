import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChunk extends Document {
  documentId: mongoose.Types.ObjectId;
  chunkIndex: number;
  text: string;
  embedding: number[];
  createdAt: Date;
}

const ChunkSchema = new Schema<IChunk>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

// Compound index for fast deletion by documentId
ChunkSchema.index({ documentId: 1, chunkIndex: 1 });

const Chunk: Model<IChunk> = mongoose.model<IChunk>('Chunk', ChunkSchema);
export default Chunk;
