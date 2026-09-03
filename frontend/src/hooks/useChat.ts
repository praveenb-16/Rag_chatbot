import { useState, useCallback, useRef, useEffect } from 'react';
import { chatApi, ChatMessage, ChatSession, ApiError, BASE_URL } from '../lib/api';

export function useChat(sessionId: string | null) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref so sendMessage always sees the latest sessionId without stale closure issues
  const sessionIdRef = useRef(sessionId);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  const loadSession = useCallback(async () => {
    if (!sessionIdRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const { session, messages } = await chatApi.getSession(sessionIdRef.current);
      setSession(session);
      setMessages(messages);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to load conversation'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (query: string): Promise<ChatMessage | null> => {
      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId || !query.trim()) return null;

      // Optimistically add user message
      const tempUserId = `temp-user-${Date.now()}`;
      const tempUserMsg: ChatMessage = {
        _id: tempUserId,
        sessionId: currentSessionId,
        role: 'user',
        content: query.trim(),
        citations: [],
        abstained: false,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);
      setSending(true);
      setError(null);

      // Optimistically add empty assistant bubble to stream into
      const tempAssistantId = `temp-assistant-${Date.now()}`;
      const tempAssistantMsg: ChatMessage = {
        _id: tempAssistantId,
        sessionId: currentSessionId,
        role: 'assistant',
        content: '',
        citations: [],
        abstained: false,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempAssistantMsg]);

      try {
        const url = `${BASE_URL}/chat/sessions/${currentSessionId}/messages`;

        const response = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query.trim() }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let finalMessage: ChatMessage | null = null;
        let buffer = '';

        while (!done && reader) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.type === 'token') {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m._id === tempAssistantId
                          ? { ...m, content: m.content + data.content }
                          : m
                      )
                    );
                  } else if (data.type === 'done') {
                    finalMessage = data.message;
                    // Replace BOTH temp bubbles with the final real assistant message.
                    // The user message is already displayed; keep it but give it a stable id.
                    setMessages((prev) => {
                      const withoutTemps = prev.filter(
                        (m) => m._id !== tempUserId && m._id !== tempAssistantId
                      );
                      return [
                        ...withoutTemps,
                        { ...tempUserMsg, _id: `user-${Date.now()}` },
                        data.message,
                      ];
                    });
                  } else if (data.type === 'error') {
                    throw new Error(data.error);
                  }
                } catch (e) {
                  // JSON parse error on incomplete SSE chunks is expected; ignore
                }
              }
            }
          }
        }
        return finalMessage;
      } catch (err) {
        // Remove optimistic bubbles on error
        setMessages((prev) =>
          prev.filter((m) => m._id !== tempUserId && m._id !== tempAssistantId)
        );
        const msg =
          err instanceof Error ? err.message : 'Failed to send message. Please try again.';
        setError(msg);
        return null;
      } finally {
        setSending(false);
      }
    },
    [] // No deps — reads sessionId via ref, so never stale
  );

  const clearError = () => setError(null);
  const resetMessages = () => setMessages([]);

  return {
    session,
    messages,
    loading,
    sending,
    error,
    loadSession,
    sendMessage,
    clearError,
    resetMessages,
  };
}
