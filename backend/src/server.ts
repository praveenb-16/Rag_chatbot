import 'dotenv/config';
import dns from 'dns';
// Force IPv4 for all DNS lookups — prevents ENETUNREACH errors on Render's free tier
// where IPv6 routes to Gmail SMTP are blocked
dns.setDefaultResultOrder('ipv4first');
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

// Support comma-separated list of allowed origins e.g.
// CORS_ORIGIN=https://college-assistant-kiot.vercel.app,http://localhost:5173
const rawOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim());

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (rawOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true, // required for httpOnly cookie cross-origin
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
    console.log(`   CORS origins: ${rawOrigins.join(', ')}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
