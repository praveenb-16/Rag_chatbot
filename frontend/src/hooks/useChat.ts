import { useState, useCallback } from 'react';
import { chatApi, ChatMessage, ChatSession, ApiError } from '../lib/api';

export function useChat(sessionId: string | null) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const { session, messages } = await chatApi.getSession(sessionId);
      setSession(session);
      setMessages(messages);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to load conversation'
      );
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const sendMessage = useCallback(
    async (query: string): Promise<ChatMessage | null> => {
      if (!sessionId || !query.trim()) return null;

      // Optimistically add user message
      const tempUserMsg: ChatMessage = {
        _id: `temp-${Date.now()}`,
        sessionId,
        role: 'user',
        content: query.trim(),
        citations: [],
        abstained: false,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);
      setSending(true);
      setError(null);

      try {
        const { message: assistantMsg } = await chatApi.sendMessage(
          sessionId,
          query.trim()
        );
        // Remove temp, add real assistant message
        setMessages((prev) => [
          ...prev.filter((m) => m._id !== tempUserMsg._id),
          // Add the real user message (returned server-side)
          {
            ...tempUserMsg,
            _id: `user-${Date.now()}`,
          },
          assistantMsg,
        ]);
        return assistantMsg;
      } catch (err) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m._id !== tempUserMsg._id));
        const msg =
          err instanceof ApiError
            ? err.message
            : 'Failed to send message. Please try again.';
        setError(msg);
        return null;
      } finally {
        setSending(false);
      }
    },
    [sessionId]
  );

  const clearError = () => setError(null);

  return {
    session,
    messages,
    loading,
    sending,
    error,
    loadSession,
    sendMessage,
    clearError,
  };
}
