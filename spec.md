# College RAG Chatbot — Build Specification

`College RAG Chatbot` is a Retrieval-Augmented Generation (RAG) system that answers student
questions using information retrieved from a college's own documents, rather than relying
solely on a language model's general knowledge.

**How to use this document:** this file is self-contained. It defines what the system means
semantically, exactly what to build, which technologies to use, the data model, the API
contract, and the visual design system. A coding agent should be able to implement the entire
application from this file alone, end to end, without further clarification. Where a decision
has one clearly better default, this document commits to it instead of listing options.

You can use `College RAG Chatbot` to:

- give students grounded answers about admissions, departments, courses, fees, exams, the
  academic calendar, hostel life, the library, clubs, placements, scholarships, policies, and
  events, sourced from documents the college has uploaded.
- let administrators maintain a knowledge base of college documents without retraining or
  fine-tuning a model.
- show students which document and passage an answer came from, so they can verify it or read
  further.
- tell a student clearly when their question can't be answered from the college's documents.

You can't use `College RAG Chatbot` to:

- guarantee an answer is factually correct. It guarantees an answer is *grounded* in retrieved
  context, not that the retrieved context is itself accurate, complete, or current.
- answer questions outside the knowledge base as though they were inside it. A question with no
  supporting document must be identified as unanswerable, not answered from the model's general
  training (see Abstention).
- enforce access control by itself. Retrieval only searches documents that have been ingested;
  restricting *who* can query *which* documents is the job of Roles and Collections, not of
  retrieval.

## Feature scope

### Core (must ship)

- Chat interface for submitting queries and receiving answers with citations.
- Account authentication with Student and Admin roles.
- Document upload, text extraction, and chunking.
- Embedding generation and a vector store with similarity search.
- A query-answering pipeline that retrieves context before generating an answer.
- Explicit abstention when no relevant context is found.
- Session-scoped chat history.
- Admin document management (upload, update, delete).
- A deployed application with working frontend–backend integration.

### Phase 2 (defined but optional)

Multiple collections / department-wise knowledge bases, an admin dashboard with analytics,
document version management, source highlighting, multilingual support, voice input and
responses, conversation export, suggested questions, answer feedback (👍/👎), automatic
summarization, OCR for scanned documents, hybrid keyword + semantic search, re-ranking,
role-based access beyond Student/Admin, AI-generated FAQs, and streaming responses. None of
these change the semantics defined below; they layer on top of the Pipeline.

## Definitions

More fundamental concepts are introduced before those that build on them.

### Document

A single file uploaded to the knowledge base as a source of information.

----

Documents are typically PDFs, but may be any supported format (`.docx`, `.txt`, or a scanned
image processed via OCR in Phase 2). A document carries metadata: at minimum a title and an
upload date, and optionally a department used to assign it to a Collection. A document that has
been uploaded but not yet ingested is not yet part of the knowledge base and cannot be retrieved.

### Chunk

A contiguous span of text extracted from a document, sized to fit within an embedding model's
input limit (target ~500 tokens, ~50-token overlap between consecutive chunks).

----

Chunking splits a document into chunks. A chunk is not required to align with sentence or
paragraph boundaries, but not fragmenting sentences retrieves and reads better. Overlap prevents
a rule spanning a chunk boundary — e.g. "Hostel fees are due by the 5th / of every month" — from
losing its meaning when split.

### Embedding

A fixed-length vector of numbers representing the semantic meaning of a chunk or a query,
produced by an embedding model.

----

Two chunks that are semantically similar ("hostel fee due date" and "when is hostel payment
deadline") produce embeddings that are close together, even though they share few exact words.

### Vector store

A database that stores embeddings alongside a reference back to their source chunk, and supports
similarity search over them. **This spec uses MongoDB Atlas Vector Search**, so the vector store
and the primary database are the same service — see Tech Stack.

### Knowledge base / Collection

The knowledge base is the complete set of documents, chunks, and embeddings available to a
deployment. A **Collection** is a named subset scoped to a department (Phase 2); the Core build
uses a single implicit collection containing every ingested document.

### Account / Role

An **Account** is an authenticated identity that owns sessions and is assigned a **Role**:

- **Student** — may open a session, submit queries, and receive answers with citations. May not
  upload, update, or delete documents.
- **Admin** — everything a Student can do, plus upload, update, and delete documents.

### Query

The text of a single question submitted by a student, after any conversation history has been
resolved into a self-contained question (Query rewriting, Phase 2 — the Core build embeds the
raw query plus the last 2–3 turns of history as context for rewriting).

### Retrieval

Embedding a query and returning the `top_k` (default **5**) chunks whose embeddings are most
similar to it from the vector store, each with a **relevance score**.

----

Retrieval always returns its top-k chunks, even when none are actually relevant — this is why
Abstention is decided by relevance score, not by whether any chunks came back at all. This spec
sets a minimum relevance threshold; a retrieved chunk below it is discarded before context
assembly.

### Context

The set of retrieved chunks (above the relevance threshold) assembled into a single block of
text passed to the LLM alongside the query, bounded by the LLM's input limit.

### Answer

The text generated by the LLM in response to a query and its context.

- **Grounded answer** — an answer whose claims are supported by the retrieved context.
- **Ungrounded answer** — an answer with claims not present in, or contradicted by, the
  retrieved context. An answer that happens to be correct but wasn't supported by context is
  still ungrounded, and is a defect the same as an answer that happens to be wrong.
- **Abstention** — deliberately declining to answer because no chunk cleared the relevance
  threshold. Given "What is the capital of France?" asked of an admissions knowledge base, the
  correct response is "I couldn't find information about that in the college's documents," not
  a guess from general knowledge.

### Citation

A reference from a claim in an answer back to the document and chunk that supports it (e.g.
`Hostel Handbook, p. 12`). A citation must be specific enough to locate the source passage — a
document title alone is not sufficient.

### Session / Turn

A **Session** is an ordered sequence of **Turns** (one query + one answer) between one account
and the chatbot, sharing conversation history. History from one session must never leak into
another account's session.

## Grounding mode

The Core build uses **Strict** grounding: the LLM is instructed to answer only from the supplied
context and to abstain if the context doesn't support an answer. This is non-negotiable for a
college chatbot — an ungrounded answer about fees or deadlines carries real cost to a student who
trusts it. (An **Augmented** mode that blends in general knowledge, clearly labeled as such, is a
Phase 2 option — do not implement it by default.)

## System architecture

```
┌────────────┐        ┌───────────────┐        ┌──────────────────────────┐
│   Browser   │◄─────►│    Vercel      │        │          Render           │
│  (Student / │  HTTPS │   (Frontend,   │  HTTPS │   (Backend API, Node.js) │
│   Admin)    │        │  React + Vite) │───────►│                          │
└────────────┘        └───────────────┘        └───────────┬──────────────┘
                                                             │
                                                             │ mongoose
                                                             ▼
                                                  ┌───────────────────────┐
                                                  │     MongoDB Atlas      │
                                                  │  (users, documents,    │
                                                  │  sessions, messages,   │
                                                  │  + Atlas Vector Search)│
                                                  └───────────────────────┘
                                                             ▲
                                                             │ REST calls
                                                  ┌───────────────────────┐
                                                  │  LLM + Embedding API   │
                                                  │ (Anthropic / OpenAI)   │
                                                  └───────────────────────┘
```

GitHub is the single source of truth; Vercel and Render each deploy from it independently, so a
push to `main` redeploys both frontend and backend without a manual step.

## Tech stack (decisive)

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| Frontend routing | React Router |
| Backend | Node.js + Express + TypeScript |
| Database + vector store | **MongoDB Atlas**, using **Atlas Vector Search** for chunk embeddings — one service does both jobs, which is why it's the default over a separate vector database |
| ODM | Mongoose |
| Auth | JWT (`jsonwebtoken` + `bcrypt`), token in an `httpOnly` cookie |
| File parsing | `pdf-parse` (PDF → text) |
| LLM | Anthropic Claude API, model `claude-sonnet-5` |
| Embeddings | OpenAI `text-embedding-3-small` (Anthropic has no embeddings endpoint, so this is a second, independent API key) |
| File upload handling | `multer` (memory storage; files are parsed then discarded, not stored long-term) |
| Frontend hosting | Vercel |
| Backend hosting | Render (Web Service) |
| Source control | GitHub |

**Valid swap:** Supabase (Postgres + `pgvector` + Supabase Auth + Supabase Storage) is an
equally valid replacement for the entire MongoDB Atlas row if the builder prefers a relational
schema — in that case, replace every Mongoose schema below with an equivalent SQL table and swap
JWT auth for Supabase Auth. Do not mix the two paths.

## Data model

```ts
// User
{
  _id: ObjectId,
  name: string,
  email: string,          // unique, lowercase, indexed
  passwordHash: string,
  role: "student" | "admin",
  createdAt: Date
}

// Document
{
  _id: ObjectId,
  title: string,
  originalFilename: string,
  department: string | null,      // Collection key, Phase 2
  uploadedBy: ObjectId,            // ref User
  status: "processing" | "ingested" | "failed",
  chunkCount: number,
  createdAt: Date,
  updatedAt: Date
}

// Chunk — collection has an Atlas Vector Search index on `embedding`
{
  _id: ObjectId,
  documentId: ObjectId,   // ref Document
  chunkIndex: number,
  text: string,
  embedding: number[],     // length matches the embedding model's dimension
  createdAt: Date
}

// Session
{
  _id: ObjectId,
  userId: ObjectId,        // ref User
  title: string,           // derived from the first query
  createdAt: Date,
  updatedAt: Date
}

// Message (one per turn, two rows per turn: role "user" and role "assistant")
{
  _id: ObjectId,
  sessionId: ObjectId,     // ref Session
  role: "user" | "assistant",
  content: string,
  citations: [{
    documentId: ObjectId,
    documentTitle: string,
    chunkId: ObjectId,
    snippet: string
  }],
  abstained: boolean,       // true only on assistant messages
  createdAt: Date
}
```

**Relationships and cascades:** a Chunk belongs to a Document; deleting a Document deletes all
its Chunks (from the vector store too — see Re-ingestion). A Message belongs to a Session; a
Session belongs to a User. Deleting a User should not silently orphan its Sessions — either
cascade the delete or reassign them to a "deleted user" placeholder, and pick one explicitly in
the implementation.

## RAG pipeline

### Ingestion

```
Upload → Extract text (pdf-parse) → Chunk (~500 tokens, ~50 overlap)
       → Embed each chunk (OpenAI) → Insert chunks into MongoDB
       → Set Document.status = "ingested"
```

Run this as a background job after the upload request returns 202, so the admin UI can poll
`Document.status` instead of blocking on a request that may take minutes for a large PDF. If any
step fails, set `status = "failed"` and do not leave partially-inserted chunks searchable —
delete any chunks already written for that document before marking it failed.

### Re-ingestion / delete

Updating a document deletes its existing chunks first, then re-runs Ingestion from the new file.
Deleting a document deletes the Document row and every Chunk with a matching `documentId` in the
same operation — an orphaned chunk pointing at a deleted document is a defect.

### Query answering

```
Query → Embed query (OpenAI) → Atlas Vector Search $vectorSearch (top_k = 5)
      → Drop chunks below relevance threshold
      → If zero chunks remain → return abstention, skip the LLM call
      → Else assemble context → call Claude with a strict system prompt
      → Parse answer, attach citations from the chunks actually used
      → Persist both Messages (user + assistant) on the Session
```

The system prompt sent to the LLM must instruct it, in substance: *answer only using the
provided context; if the context does not contain the answer, say so explicitly instead of
guessing.*

## API specification

All routes are prefixed with `/api`. Protected routes require the JWT cookie; `admin`-only
routes additionally require `role: "admin"`.

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/signup` | none | `{ name, email, password }` | `{ user }` (sets cookie) |
| POST | `/auth/login` | none | `{ email, password }` | `{ user }` (sets cookie) |
| POST | `/auth/logout` | any | — | `{ success: true }` (clears cookie) |
| GET | `/auth/me` | any | — | `{ user }` |
| GET | `/documents` | admin | — | `{ documents: Document[] }` |
| POST | `/documents` | admin | multipart: `file`, `title`, `department?` | `202 { document }` |
| PUT | `/documents/:id` | admin | multipart: `file?`, `title?`, `department?` | `{ document }` |
| DELETE | `/documents/:id` | admin | — | `{ success: true }` |
| POST | `/chat/sessions` | student, admin | — | `{ session }` |
| GET | `/chat/sessions` | student, admin | — | `{ sessions: Session[] }` (own sessions only) |
| GET | `/chat/sessions/:id` | student, admin | — | `{ session, messages: Message[] }` |
| POST | `/chat/sessions/:id/messages` | student, admin | `{ query: string }` | `{ message: Message }` |
| DELETE | `/chat/sessions/:id` | student, admin | — | `{ success: true }` |
| GET | `/health` | none | — | `{ status: "ok" }` |

Every endpoint validates its input (required fields, file type/size ≤ `MAX_UPLOAD_MB`, non-empty
`query`) and returns errors as `{ error: string }` with an appropriate 4xx/5xx status — never a
bare 500 with no message.

## Frontend routes

| Path | Access | Purpose |
|---|---|---|
| `/` | public | redirect to `/chat` if authenticated, else `/login` |
| `/login` | public | login form |
| `/signup` | public | signup form |
| `/chat` | student, admin | start a new session |
| `/chat/:sessionId` | student, admin | resume a session, sidebar shows history |
| `/admin` | admin only | document list + upload |

## UI design system — light, Google Material–inspired, professional

The whole app uses a **light theme only**. No dark mode toggle is required. Base it on Google's
Material Design 3 language: white surfaces, one confident blue accent, generous whitespace, pill
buttons, soft single-layer shadows instead of heavy borders, and a geometric sans-serif typeface.

### Design tokens

```css
:root {
  /* Color */
  --color-primary: #1A73E8;
  --color-primary-hover: #1765CC;
  --color-primary-container: #D2E3FC;
  --color-on-primary: #FFFFFF;
  --color-background: #FFFFFF;
  --color-surface: #F8F9FA;
  --color-surface-variant: #F1F3F4;
  --color-outline: #DADCE0;
  --color-text-primary: #202124;
  --color-text-secondary: #5F6368;
  --color-success: #188038;
  --color-warning: #F9AB00;
  --color-error: #D93025;

  /* Typography */
  --font-family: 'Inter', 'Roboto', -apple-system, sans-serif;
  --font-size-h1: 28px;
  --font-size-h2: 22px;
  --font-size-h3: 18px;
  --font-size-body: 15px;
  --font-size-caption: 12px;
  --weight-regular: 400;
  --weight-medium: 500;

  /* Spacing — 8px grid */
  --space-1: 4px; --space-2: 8px; --space-3: 16px;
  --space-4: 24px; --space-5: 32px; --space-6: 48px;

  /* Shape */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-pill: 999px;

  /* Elevation */
  --elevation-1: 0 1px 2px rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15);
  --elevation-2: 0 1px 3px rgba(60,64,67,.30), 0 4px 8px 3px rgba(60,64,67,.15);
}
```

### Components

- **Buttons** — pill-shaped (`--radius-pill`). Primary: filled `--color-primary`, white text,
  darkens to `--color-primary-hover` on hover. Secondary: white background, 1px
  `--color-primary` border, `--color-primary` text. Disabled: `--color-surface-variant`
  background, `--color-text-secondary` text, no shadow.
- **Inputs** — `--radius-sm`, 1px `--color-outline` border, white background. On focus: border
  becomes `--color-primary` (2px) with no glow/shadow, matching Google's minimal focus style.
- **Cards** — white background, `--radius-md`, `--elevation-1`, `--space-4` padding, no visible
  border (the shadow does the separating).
- **Chat bubbles** — user turns are right-aligned, `--color-primary-container` background,
  `--color-text-primary` text, `--radius-md` with a slightly squared bottom-right corner.
  Assistant turns are left-aligned, white background with a 1px `--color-outline` border,
  `--radius-md`. Citation chips render below an assistant bubble as small pill tags
  (`--color-surface-variant` background, `--font-size-caption`) that expand the source snippet
  on click.
- **Sidebar** — `--color-surface` background, session list items get `--color-surface-variant`
  on hover and `--color-primary-container` with a 3px left accent bar when active.
- **Top app bar** — white, 1px bottom border in `--color-outline`, logo + title left-aligned,
  account menu right-aligned.
- **Loading state** — an animated three-dot indicator inside an assistant-style bubble while
  waiting on retrieval + generation; skeleton rows (shimmering `--color-surface-variant` blocks)
  while a session or document list is loading.
- **Status chips** (admin document table) — `Ingested` green (`--color-success` text on a
  tinted green background), `Processing` amber (`--color-warning`), `Failed` red
  (`--color-error`).

### Screens

- **Login / Signup** — centered card, max-width 400px, on `--color-background`. Logo, then an
  `h1` heading, then stacked labeled inputs with `--space-3` gaps, then a full-width primary
  pill button, then a secondary text link to the other page.
- **Chat** — two columns. Left: 280px sidebar with a "+ New chat" pill button pinned at the top
  and the session list below it (collapses to a slide-over drawer under 768px width). Right: top
  app bar, then a scrollable message thread capped at 720px width and centered, then a fixed
  input bar at the bottom — a pill-shaped, multi-line textarea with a circular send button
  (disabled with a spinner while a response is pending).
- **Admin dashboard** — top app bar, `h1` "Manage Documents", a dashed-border upload drop-zone
  card at the top ("Drag & drop a PDF, or click to browse"), and a table below it: Title,
  Department, Status (chip), Uploaded date, Actions (re-ingest, delete). Show an empty-state
  illustration and message when there are zero documents.

### Accessibility

Body text must hold ≥4.5:1 contrast (the palette above satisfies this). Every interactive
element gets a visible focus ring. Icon-only buttons (send, delete, re-ingest) need an
`aria-label`. The chat input sends on `Enter` and inserts a newline on `Shift+Enter`.

## Requirements checklist

### Frontend

- [ ] Responsive at both desktop and mobile widths.
- [ ] Navigation between chat, chat history, and (admin) document management.
- [ ] Client-validated forms: login, signup, upload, chat input.
- [ ] Loading states for generation, upload/ingestion, and session/history load.
- [ ] Plain-language error handling for failed upload, timeout, or dropped connection.
- [ ] Visual separation between student chat and admin console; citations visually distinct
      from answer text.

### Backend

- [ ] Endpoints from the API specification above, all implemented.
- [ ] Business logic matches Ingestion and Query answering exactly — retrieval always runs
      before generation.
- [ ] Input validation on every endpoint.
- [ ] Errors distinguish a recoverable case (abstention) from an actual failure (5xx).
- [ ] All secrets and endpoints come from environment variables — none hardcoded or committed.

### Database

- [ ] Schema matches the Data model above.
- [ ] Full CRUD on documents, including cascading chunk deletion.
- [ ] Required-field and enum validation at the schema layer.
- [ ] No orphaned chunks or messages after a delete.

### Authentication

- [ ] Signup, login, logout implemented.
- [ ] Protected routes reject unauthenticated or wrong-role requests (401/403).
- [ ] Frontend redirects unauthenticated users away from protected pages.
- [ ] Session token stored in an `httpOnly` cookie, not `localStorage`.

## Environment variables

**Backend (`backend/.env`):**

```
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/college-rag
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=7d
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-sonnet-5
OPENAI_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-3-small
CORS_ORIGIN=https://your-frontend.vercel.app
MAX_UPLOAD_MB=20
TOP_K=5
RELEVANCE_THRESHOLD=0.75
```

**Frontend (`frontend/.env`):**

```
VITE_API_BASE_URL=https://your-backend.onrender.com/api
```

## Project folder structure

```
college-rag-chatbot/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/          # MessageBubble, ChatInput, Sidebar, CitationChip
│   │   │   ├── admin/         # DocumentTable, UploadDropzone, StatusChip
│   │   │   └── ui/            # Button, Input, Card (shared primitives)
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Signup.tsx
│   │   │   ├── Chat.tsx
│   │   │   └── AdminDashboard.tsx
│   │   ├── hooks/              # useAuth, useSessions, useChat
│   │   ├── lib/api.ts          # fetch wrapper using VITE_API_BASE_URL
│   │   ├── App.tsx             # routes + protected-route wrapper
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/              # auth, documents, chat
│   │   ├── controllers/
│   │   ├── models/               # User, Document, Chunk, Session, Message
│   │   ├── services/
│   │   │   ├── ingestion.service.ts   # extract → chunk → embed → store
│   │   │   ├── retrieval.service.ts   # embed query → vector search → threshold
│   │   │   └── rag.service.ts          # context assembly → LLM call → citations
│   │   ├── middleware/            # auth.middleware, error.middleware
│   │   ├── config/db.ts
│   │   └── server.ts
│   └── package.json
└── README.md
```

## Deployment

The project must be deployed and reachable at a public URL, not only runnable locally.

| Component | Platform |
|---|---|
| Source code | GitHub |
| Frontend | Vercel |
| Backend | Render |
| Database + vector store | MongoDB Atlas |

The frontend must call the backend's public Render URL via `VITE_API_BASE_URL`, set as a Vercel
environment variable at build time — never hardcoded and never `localhost` in production. Both
Vercel and Render should auto-deploy on every push to `main`.

## Acceptance checklist

- [ ] A student can sign up, log in, ask a question, and receive a grounded answer with at
      least one citation, in under ~10 seconds.
- [ ] A question with no supporting document returns an explicit abstention, not a guess.
- [ ] An admin can upload a PDF and see its status move from `processing` to `ingested`.
- [ ] Deleting a document removes it from future retrieval results immediately.
- [ ] A student cannot reach `/admin` or call admin endpoints.
- [ ] Refreshing `/chat/:sessionId` reloads that session's full history.
- [ ] The deployed frontend URL and backend URL are both publicly reachable, and the frontend
      is correctly pointed at the deployed backend, not `localhost`.