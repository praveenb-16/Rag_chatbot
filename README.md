# AI Nexus — KIOT Knowledge Assistant

<div align="center">

**A production-ready RAG chatbot for KIOT (Knowledge Institute of Technology)**  
Students get instant, grounded answers from official college documents with source citations.  
Admins manage the entire knowledge base from a dedicated dashboard.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-college--assistant--kiot.vercel.app-blue?style=flat-square)](https://college-assistant-kiot.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square)](https://render.com)
[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square)](https://vercel.com)

</div>

---

## ✨ Features

### For Students
- 💬 **GPT-style streaming chat** — answers stream in real-time token by token
- 📚 **Source citations** — every answer shows exactly which document it came from
- 🎙️ **Voice input** — speak your question with animated waveform feedback
- 📱 **Mobile-first** — fully responsive, works on any device
- 🔖 **Predefined prompts** — quick-start cards for common questions
- 📋 **Chat history** — all sessions saved and accessible from the sidebar
- 🔄 **Retry / Regenerate** — re-send the last message if needed

### For Admins
- 📂 **Document management** — upload, update, and delete PDF/DOCX/TXT documents
- 🌐 **URL scraping** — ingest web pages directly by URL
- 📊 **Processing status** — real-time ingestion status for each document
- 🔐 **Role-based access** — admin routes protected separately from student routes

### System
- 🔐 **OTP email verification** — signup requires email verification via Brevo
- 🛡️ **JWT Bearer token auth** — works cross-origin on all mobile browsers
- 🚫 **Hallucination prevention** — auto-abstains when no relevant context is found
- 💾 **Conversation history** — last 3 turns sent to LLM for context-aware answers

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite + TypeScript + Vanilla CSS |
| **Backend** | Node.js + Express + TypeScript |
| **Database** | MongoDB Atlas |
| **Vector Search** | MongoDB Atlas Vector Search |
| **LLM** | OpenRouter API (`openai/gpt-4o-mini`) |
| **Embeddings** | OpenRouter API (`openai/text-embedding-3-small`) |
| **Auth** | JWT Bearer Token (localStorage) |
| **Email / OTP** | Brevo HTTP API (no SMTP — works on Render free tier) |
| **Frontend Host** | Vercel |
| **Backend Host** | Render |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- OpenRouter API key → [openrouter.ai](https://openrouter.ai)
- Brevo account (free) → [app.brevo.com](https://app.brevo.com)

### 1. Clone and install

```bash
git clone https://github.com/praveenb-16/Rag_chatbot.git
cd Rag_chatbot

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment variables

**`backend/.env`** (create this file):

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/college-rag
JWT_SECRET=your-long-random-secret-here
JWT_EXPIRES_IN=7d

# OpenRouter (LLM + Embeddings)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openai/gpt-4o-mini
EMBEDDING_MODEL=openai/text-embedding-3-small

# CORS — comma-separated list of allowed frontend origins
CORS_ORIGIN=http://localhost:5173

# Email / OTP via Brevo (HTTP API — no SMTP ports needed)
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=your@email.com

# Tuning
MAX_UPLOAD_MB=20
TOP_K=15
RELEVANCE_THRESHOLD=0.40
OTP_EXPIRES_MINUTES=10
```

**`frontend/.env`** (create this file):

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Set up MongoDB Atlas Vector Search Index

> ⚠️ **Required before the RAG pipeline works.**

1. Open [MongoDB Atlas](https://cloud.mongodb.com) → your cluster
2. Go to **Atlas Search** → **Create Search Index**
3. Choose **Atlas Vector Search** → JSON editor
4. Select database `college-rag`, collection `chunks`
5. Paste this index definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

6. Name the index exactly: **`chunk_embeddings`**
7. Click **Create** and wait for status → **Active**

### 4. Run locally

```bash
# Terminal 1 — Backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev
```

---

## 🔐 Creating an Admin Account

All signups create student accounts by default. To promote to admin:

```js
// Run in MongoDB Atlas → Collections → users
db.users.updateOne(
  { email: "admin@kiot.ac.in" },
  { $set: { role: "admin" } }
)
```

Or use **MongoDB Compass** to edit the document directly.

---

## ☁️ Deployment

### Backend → Render

1. Create a **Web Service** at [render.com](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add all environment variables from the section above
5. Set `CORS_ORIGIN` to include your Vercel URL:
   ```
   https://your-app.vercel.app,http://localhost:5173
   ```

> ⚠️ **Render free tier blocks all outbound SMTP ports (25, 465, 587).** That's why this project uses **Brevo HTTP API** for emails instead of nodemailer/Gmail SMTP.

### Frontend → Vercel

1. Import repository at [vercel.com](https://vercel.com)
2. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
3. Add environment variable:
   - `VITE_API_BASE_URL` = `https://your-render-backend.onrender.com/api`
4. The `frontend/vercel.json` handles SPA routing automatically — no 404 on refresh.

---

## 📁 Project Structure

```
Rag_chatbot/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/          # MessageBubble, ChatInput, Sidebar,
│   │   │   │                  # CitationChip, LoadingBubble
│   │   │   └── admin/         # DocumentTable, UploadDropzone, StatusChip
│   │   ├── pages/             # Login, Signup, Chat, AdminDashboard
│   │   ├── hooks/             # useAuth, useSessions, useChat
│   │   ├── lib/
│   │   │   └── api.ts         # Centralized API client (Bearer token auth)
│   │   └── App.tsx
│   ├── vercel.json            # SPA routing rewrite rules
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/            # auth, chat, documents, health
│   │   ├── controllers/       # auth, chat, documents
│   │   ├── models/            # User, Session, Message, Chunk, OtpRecord
│   │   ├── services/
│   │   │   ├── ingestion.service.ts   # PDF/DOCX/TXT → chunks → embeddings
│   │   │   ├── retrieval.service.ts   # Atlas Vector Search
│   │   │   ├── rag.service.ts         # LLM call + citation builder
│   │   │   ├── otp.service.ts         # Brevo email API
│   │   │   └── scraping.service.ts    # URL → text ingestion
│   │   ├── middleware/        # requireAuth, error handler
│   │   └── server.ts
│   └── package.json
└── README.md
```

---

## 🔌 API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/send-otp` | — | Send OTP to email for verification |
| `POST` | `/api/auth/signup` | — | Create student account (OTP required) |
| `POST` | `/api/auth/login` | — | Login → returns `{ token, user }` |
| `POST` | `/api/auth/logout` | any | Logout |
| `GET` | `/api/auth/me` | any | Get current user profile |
| `GET` | `/api/documents` | admin | List all documents |
| `POST` | `/api/documents` | admin | Upload document (multipart/form-data) |
| `PUT` | `/api/documents/:id` | admin | Replace / re-ingest document |
| `DELETE` | `/api/documents/:id` | admin | Delete document + all its chunks |
| `POST` | `/api/documents/scrape` | admin | Ingest a web page by URL |
| `POST` | `/api/chat/sessions` | auth | Create new chat session |
| `GET` | `/api/chat/sessions` | auth | List all sessions for current user |
| `GET` | `/api/chat/sessions/:id` | auth | Get session with full message history |
| `POST` | `/api/chat/sessions/:id/messages` | auth | Send query → SSE streaming RAG response |
| `DELETE` | `/api/chat/sessions/:id` | auth | Delete session + messages |
| `GET` | `/api/health` | — | Health check |

> **Auth**: All protected routes require `Authorization: Bearer <token>` header.  
> The `/messages` endpoint returns **Server-Sent Events (SSE)** — `token` events stream the answer, followed by a `done` event with the saved message object.

---

## 🧠 RAG Pipeline

```
User Query
    │
    ▼
Embed query (text-embedding-3-small via OpenRouter)
    │
    ▼
Atlas Vector Search — cosine similarity, top_k=15
    │
    ▼
Filter by relevance threshold (default 0.40)
    │
    ├── 0 chunks found → Abstain (no LLM call, return polite refusal)
    │
    └── Chunks found → Assemble numbered context block
            │
            ▼
        Call LLM (gpt-4o-mini via OpenRouter, streaming)
            │
            ▼
        Stream tokens → SSE to frontend
            │
            ▼
        Save answer + citations to MongoDB
            │
            ▼
        Send `done` event with persisted message
```

---

## 🔧 Known Production Gotchas

| Issue | Cause | Solution |
|-------|-------|----------|
| SMTP email fails on Render | Render blocks ports 25, 465, 587 | Use **Brevo HTTP API** (`BREVO_API_KEY`) |
| 404 on page refresh (Vercel) | Vercel doesn't know about SPA routes | `frontend/vercel.json` rewrites all routes to `index.html` |
| Mobile chat auth fails | iOS Safari blocks cross-origin `SameSite=None` cookies | JWT stored in `localStorage`, sent as `Authorization: Bearer` header |
| CORS error on mobile | `CORS_ORIGIN` set to `localhost` only | Set to `https://your-app.vercel.app,http://localhost:5173` |

---

## 📄 License

MIT
