const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface ApiOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const config: RequestInit = {
    method,
    credentials: 'include', // always send httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, config);

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(data.error || `HTTP ${res.status}`, res.status);
  }

  return res.json() as Promise<T>;
}

async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    // Do NOT set Content-Type — browser sets it with multipart boundary automatically
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(data.error || `HTTP ${res.status}`, res.status);
  }

  return res.json() as Promise<T>;
}

async function updateWithFile<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(data.error || `HTTP ${res.status}`, res.status);
  }

  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  sendOTP: (email: string) =>
    request<{ message: string }>('/auth/send-otp', { method: 'POST', body: { email } }),

  signup: (data: { name: string; email: string; password: string; otp: string }) =>
    request<{ user: User }>('/auth/signup', { method: 'POST', body: data }),

  login: (data: { email: string; password: string }) =>
    request<{ user: User }>('/auth/login', { method: 'POST', body: data }),

  logout: () =>
    request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  me: () => request<{ user: User }>('/auth/me'),
};

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsApi = {
  list: () => request<{ documents: CollegeDocument[] }>('/documents'),

  upload: (formData: FormData) =>
    uploadFile<{ document: CollegeDocument }>('/documents', formData),

  update: (id: string, formData: FormData) =>
    updateWithFile<{ document: CollegeDocument }>(`/documents/${id}`, formData),

  delete: (id: string) =>
    request<{ success: boolean }>(`/documents/${id}`, { method: 'DELETE' }),

  scrapeUrl: (url: string, title?: string) =>
    request<{ message: string; url: string; title: string }>('/documents/scrape', {
      method: 'POST',
      body: { url, title },
    }),
};

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatApi = {
  createSession: () =>
    request<{ session: ChatSession }>('/chat/sessions', { method: 'POST' }),

  listSessions: () =>
    request<{ sessions: ChatSession[] }>('/chat/sessions'),

  getSession: (id: string) =>
    request<{ session: ChatSession; messages: ChatMessage[] }>(
      `/chat/sessions/${id}`
    ),

  deleteSession: (id: string) =>
    request<{ success: boolean }>(`/chat/sessions/${id}`, { method: 'DELETE' }),

  sendMessage: (sessionId: string, query: string) =>
    request<{ message: ChatMessage }>(`/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: { query },
    }),
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  createdAt: string;
}

export interface CollegeDocument {
  _id: string;
  title: string;
  originalFilename: string;
  department: string | null;
  uploadedBy: string | { _id: string; name: string; email: string };
  status: 'processing' | 'ingested' | 'failed';
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Citation {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  snippet: string;
}

export interface ChatMessage {
  _id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  abstained: boolean;
  createdAt: string;
}

export interface ChatSession {
  _id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export { ApiError };
