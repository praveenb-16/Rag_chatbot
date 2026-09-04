import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOtpRecord extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
}

const OtpSchema = new Schema<IOtpRecord>(
  {
    email: { type: String, required: true, lowercase: true },
    otp: { type: String, required: true },
    // MongoDB TTL index: automatically deletes the document after expiresAt
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true } // adds createdAt + updatedAt automatically
);

// Ensure only one active OTP per email
OtpSchema.index({ email: 1 }, { unique: true });

const OtpRecord: Model<IOtpRecord> = mongoose.model<IOtpRecord>('OtpRecord', OtpSchema);
export default OtpRecord;
