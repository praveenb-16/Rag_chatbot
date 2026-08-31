import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import documentsRoutes from './routes/documents.routes';
import chatRoutes from './routes/chat.routes';
import healthRoutes from './routes/health.routes';
import { errorHandler, notFound } from './middleware/error.middleware';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true, // required for httpOnly cookie to be sent cross-origin
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/chat', chatRoutes);

// ── Error handling ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
    console.log(`   CORS origin: ${CORS_ORIGIN}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
