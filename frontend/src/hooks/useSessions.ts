import { useState, useCallback } from 'react';
import { chatApi, ChatSession, ApiError } from '../lib/api';

export function useSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { sessions } = await chatApi.listSessions();
      setSessions(sessions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  const createSession = useCallback(async (): Promise<ChatSession | null> => {
    try {
      const { session } = await chatApi.createSession();
      setSessions((prev) => [session, ...prev]);
      return session;
    } catch {
      return null;
    }
  }, []);

  const deleteSession = useCallback(async (id: string): Promise<boolean> => {
    try {
      await chatApi.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s._id !== id));
      return true;
    } catch {
      return false;
    }
  }, []);

  const updateSessionTitle = useCallback((id: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s._id === id ? { ...s, title } : s))
    );
  }, []);

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    createSession,
    deleteSession,
    updateSessionTitle,
  };
}
