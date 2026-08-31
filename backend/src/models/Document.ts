import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDocument extends Document {
  title: string;
  originalFilename: string;
  department: string | null;
  uploadedBy: mongoose.Types.ObjectId;
  status: 'processing' | 'ingested' | 'failed';
  chunkCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    title: { type: String, required: true, trim: true },
    originalFilename: { type: String, required: true },
    department: { type: String, default: null },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['processing', 'ingested', 'failed'],
      default: 'processing',
    },
    chunkCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const CollegeDocument: Model<IDocument> = mongoose.model<IDocument>(
  'Document',
  DocumentSchema
);
export default CollegeDocument;
