import { useState, useCallback } from 'react';
import { chatApi, ChatMessage, ChatSession, ApiError, BASE_URL } from '../lib/api';

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
        const url = `${BASE_URL}/chat/sessions/${sessionId}/messages`;
        
        // Optimistically add empty assistant message to stream into
        const tempAssistantMsg: ChatMessage = {
          _id: `temp-assistant-${Date.now()}`,
          sessionId,
          role: 'assistant',
          content: '',
          citations: [],
          abstained: false,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempUserMsg, tempAssistantMsg]);
        setSending(true);

        const response = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
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
            buffer = lines.pop() || ''; // keep the last incomplete line
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.type === 'token') {
                    setMessages((prev) => 
                      prev.map((m) => 
                        m._id === tempAssistantMsg._id 
                          ? { ...m, content: m.content + data.content } 
                          : m
                      )
                    );
                  } else if (data.type === 'done') {
                    finalMessage = data.message;
                    // Replace temp user and temp assistant with real user (which isn't returned, but we keep tempUserMsg) and real assistant msg
                    setMessages((prev) => {
                      const newPrev = prev.filter(m => m._id !== tempUserMsg._id && m._id !== tempAssistantMsg._id);
                      return [
                        ...newPrev,
                        { ...tempUserMsg, _id: `user-${Date.now()}` },
                        data.message
                      ];
                    });
                  } else if (data.type === 'error') {
                    throw new Error(data.error);
                  }
                } catch (e) {
                  // JSON parse error on incomplete chunks can happen, but SSE lines are usually full JSON
                  console.error('SSE parse error:', e);
                }
              }
            }
          }
        }
        return finalMessage;
      } catch (err) {
        // Remove optimistic messages on error
        setMessages((prev) => prev.filter((m) => m._id !== tempUserMsg._id && !m._id.startsWith('temp-assistant-')));
        const msg = err instanceof Error ? err.message : 'Failed to send message. Please try again.';
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
