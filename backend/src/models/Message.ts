import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICitation {
  documentId: mongoose.Types.ObjectId;
  documentTitle: string;
  chunkId: mongoose.Types.ObjectId;
  snippet: string;
}

export interface IMessage extends Document {
  sessionId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  citations: ICitation[];
  abstained: boolean;
  createdAt: Date;
}

const CitationSchema = new Schema<ICitation>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    documentTitle: { type: String, required: true },
    chunkId: { type: Schema.Types.ObjectId, ref: 'Chunk', required: true },
    snippet: { type: String, required: true },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    citations: { type: [CitationSchema], default: [] },
    abstained: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

const Message: Model<IMessage> = mongoose.model<IMessage>('Message', MessageSchema);
export default Message;
