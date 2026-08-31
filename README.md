# College RAG Chatbot

A full-stack Retrieval-Augmented Generation (RAG) chatbot for colleges. Students get grounded answers from official college documents with citations; admins manage the knowledge base.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Vanilla CSS |
| Backend | Node.js + Express + TypeScript |
| Database + Vector Store | MongoDB Atlas + Atlas Vector Search |
| LLM + Embeddings | OpenRouter API (OpenAI-compatible) |
| Auth | JWT in httpOnly cookies |

## Features

- **Enterprise-Grade UI/UX**: Custom responsive layout featuring a sleek, pill-shaped composer, dynamic sidebars, and fluid animations.
- **Voice Input**: Integrated Web Speech API support for continuous voice dictation with animated audio waveform feedback.
- **Mobile First & Accessible**: Typography scaled to prevent iOS auto-zoom, and all interactive elements meet the minimum `44x44px` touch target requirements.
- **Rich Markdown & Citations**: Fully renders markdown (tables, code blocks) and features interactive citation chips that smoothly highlight their source references in the chat.
- **Admin Dashboard**: Manage the knowledge base by uploading, updating, or deleting documents directly from the UI.
- **Strict Grounding**: The RAG pipeline automatically abstains from answering if no relevant chunks are found, avoiding hallucination.

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- OpenRouter API key

### 1. Clone and install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment variables

**Backend** — copy and fill in `backend/.env.example`:
```bash
cp backend/.env.example backend/.env
```

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/college-rag
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=7d
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openrouter/auto
EMBEDDING_MODEL=openai/text-embedding-3-small
CORS_ORIGIN=http://localhost:5173
MAX_UPLOAD_MB=20
TOP_K=5
RELEVANCE_THRESHOLD=0.75
```

**Frontend** — copy and fill in `frontend/.env.example`:
```bash
cp frontend/.env.example frontend/.env
```

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Set up MongoDB Atlas Vector Search Index

> ⚠️ **Required before the RAG pipeline works.** Without this index, vector search will fail.

1. Open [MongoDB Atlas](https://cloud.mongodb.com) → your cluster
2. Go to **Search** → **Create Search Index**
3. Choose **Atlas Vector Search** (JSON editor)
4. Select database `college-rag`, collection `chunks`
5. Use this index definition:

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

6. Name the index: **`chunk_embeddings`** (must match exactly)
7. Click **Create Search Index** and wait for it to become Active

### 4. Run the application

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Creating an Admin Account

Signup creates a student account by default. To create an admin:

1. Sign up normally at `/signup`
2. Connect to MongoDB Atlas and update the user document:
```js
db.users.updateOne({ email: "your@email.com" }, { $set: { role: "admin" } })
```
Or use MongoDB Compass to edit the document.

---

## Deployment

### Backend → Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add all environment variables from `backend/.env.example`
5. Set `CORS_ORIGIN` to your Vercel frontend URL

### Frontend → Vercel

1. Import your GitHub repository on [Vercel](https://vercel.com)
2. Set:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add environment variable:
   - `VITE_API_BASE_URL` = your Render backend URL + `/api`

---

## Project Structure

```
college-rag-chatbot/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/          # MessageBubble, ChatInput, Sidebar, CitationChip, LoadingBubble
│   │   │   ├── admin/         # DocumentTable, UploadDropzone, StatusChip
│   │   │   └── ui/            # Button, Input, Card
│   │   ├── pages/             # Login, Signup, Chat, AdminDashboard
│   │   ├── hooks/             # useAuth, useSessions, useChat
│   │   ├── lib/api.ts
│   │   └── App.tsx
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── services/          # ingestion, retrieval, rag
│   │   ├── middleware/
│   │   └── server.ts
│   └── package.json
└── README.md
```

---

## API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | none | Create student account |
| POST | `/api/auth/login` | none | Login |
| POST | `/api/auth/logout` | any | Logout |
| GET | `/api/auth/me` | any | Get current user |
| GET | `/api/documents` | admin | List all documents |
| POST | `/api/documents` | admin | Upload document (multipart) |
| PUT | `/api/documents/:id` | admin | Update / re-ingest document |
| DELETE | `/api/documents/:id` | admin | Delete document + chunks |
| POST | `/api/chat/sessions` | student/admin | Create chat session |
| GET | `/api/chat/sessions` | student/admin | List own sessions |
| GET | `/api/chat/sessions/:id` | student/admin | Get session + messages |
| POST | `/api/chat/sessions/:id/messages` | student/admin | Send query, get RAG answer |
| DELETE | `/api/chat/sessions/:id` | student/admin | Delete session |
| GET | `/api/health` | none | Health check |

---

## RAG Pipeline

```
Query → Embed (OpenRouter) → Atlas Vector Search (top_k=5)
      → Filter by relevance threshold (default 0.75)
      → If 0 chunks → Abstain (no LLM call)
      → Assemble context → Call LLM (OpenRouter) with strict prompt
      → Return answer + citations → Persist messages
```
