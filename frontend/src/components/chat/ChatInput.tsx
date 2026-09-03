import { KeyboardEvent, useRef, useEffect, useState, useCallback } from 'react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
}

// ── Web Speech API type declarations (not in default TS lib) ────────────────
declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }

  interface ISpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
    onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
    onresult: ((this: ISpeechRecognition, ev: ISpeechRecognitionEvent) => void) | null;
    onerror: ((this: ISpeechRecognition, ev: ISpeechRecognitionErrorEvent) => void) | null;
  }

  interface ISpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: ISpeechRecognitionResultList;
  }

  interface ISpeechRecognitionResultList {
    readonly length: number;
    item(index: number): ISpeechRecognitionResult;
    [index: number]: ISpeechRecognitionResult;
  }

  interface ISpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): ISpeechRecognitionAlternative;
    [index: number]: ISpeechRecognitionAlternative;
  }

  interface ISpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface ISpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }
}

export function ChatInput({ onSend, disabled = false, value, onChange }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const interimRef = useRef('');          // interim transcript from speech
  const baseValueRef = useRef('');        // value in input before mic started

  const [focused, setFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [micSupported, setMicSupported] = useState(true);

  // Check browser support
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setMicSupported(false);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [value]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    interimRef.current = '';
  }, []);

  const startListening = useCallback(() => {
    setMicError(null);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMicError('Voice input is not supported in this browser. Try Chrome or Edge.'); return; }

    const recognition = new SR();
    recognition.lang = 'en-IN';          // English (India) – works for most Indian accents
    recognition.continuous = true;        // keep listening like ChatGPT
    recognition.interimResults = true;    // show partial results live
    recognition.maxAlternatives = 1;

    // Save what was already in the input before mic started
    baseValueRef.current = value;
    interimRef.current = '';

    recognition.onstart = () => {
      setIsListening(true);
      setMicError(null);
    };

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Accumulate finals, show interim live
      if (finalTranscript) {
        interimRef.current += finalTranscript;
      }

      // Update input: base + accumulated finals + current interim
      const combined = (baseValueRef.current ? baseValueRef.current + ' ' : '') +
        interimRef.current + interimTranscript;
      onChange(combined.trimStart());
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setMicError('Microphone permission denied. Please allow mic access in your browser.');
      } else if (event.error === 'no-speech') {
        setMicError('No speech detected. Please try again.');
        setTimeout(() => setMicError(null), 3000);
      } else if (event.error !== 'aborted') {
        setMicError(`Voice error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      // If still in listening state, auto-restart (continuous mode like ChatGPT)
      // But only if we explicitly started it and haven't stopped
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [value, onChange]);

  const toggleMic = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isListening) stopListening();
      handleSend();
    }
    if (e.key === 'Escape' && isListening) {
      stopListening();
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    if (isListening) stopListening();
    onSend(trimmed);
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="chat-input-bar" style={{
      padding: '12px 20px 16px',
      background: 'var(--surface-2)',
      borderTop: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <div className="chat-input-inner" style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Removed mobile disclaimer to prevent DOM clutter */}

        {/* Mic error banner */}
        {micError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', marginBottom: 8,
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 8, fontSize: 12, color: 'var(--red)',
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
              <path fillRule="evenodd" d="M6.5 1a5.5 5.5 0 100 11A5.5 5.5 0 006.5 1zM6 4h1v3.5H6V4zm.5 5.25a.75.75 0 110-1.5.75.75 0 010 1.5z" clipRule="evenodd"/>
            </svg>
            {micError}
            <button onClick={() => setMicError(null)} style={{ marginLeft: 'auto', border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Active listening banner — like ChatGPT's "Listening..." */}
        {isListening && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', marginBottom: 8,
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 8, fontSize: 12.5, color: '#DC2626', fontWeight: 500,
          }}>
            {/* Animated waveform bars */}
            <MicWaveform />
            Listening... speak now
            <span className="hidden sm:inline" style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
              (press Esc or click mic to stop)
            </span>
            <button
              onClick={stopListening}
              style={{
                marginLeft: 'auto', border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.08)', color: '#DC2626',
                borderRadius: 6, padding: '3px 10px', fontSize: 11.5, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Stop
            </button>
          </div>
        )}

        {/* Composer — wrapped in form so mobile keyboard 'Send'/'Go' submits */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ margin: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 8,
          background: 'var(--surface)',
          border: `1px solid ${isListening ? '#EF4444' : focused ? 'var(--blue)' : 'var(--border-strong)'}`,
          borderRadius: 24, padding: '6px 8px 6px 12px',
          boxShadow: isListening
            ? '0 0 0 3px rgba(239,68,68,0.1), 0 2px 8px rgba(0,0,0,0.06)'
            : focused
              ? '0 0 0 3px rgba(74,144,217,0.1), 0 4px 12px rgba(0,0,0,0.05)'
              : '0 2px 8px rgba(0,0,0,0.04)',
          transition: 'all 0.2s',
        }}>
          {/* + Button */}
          <button
            aria-label="Add attachment"
            title="Attach file"
            style={{
              width: 32, height: 32, border: 'none', borderRadius: '50%',
              background: 'transparent', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, alignSelf: 'center',
              transition: 'background 0.15s, color 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>

          {/* Textarea — starts single-line, grows with content */}
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={isListening ? '🎤 Listening...' : 'Ask anything'}
            rows={1}
            disabled={disabled}
            aria-label="Chat message input"
            enterKeyHint="send"
            style={{
              flex: 1, resize: 'none', border: 'none', background: 'transparent',
              outline: 'none', fontFamily: 'inherit', fontSize: 16,
              color: 'var(--text-primary)', lineHeight: 1.5,
              minHeight: 24, maxHeight: 160, padding: '7px 0',
              opacity: disabled ? 0.6 : 1,
              overflowY: 'auto', alignSelf: 'center'
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'center' }}>
            {/* Model Select */}
            <select
              className="model-select-mobile-hide"
              style={{
                padding: '4px 8px', borderRadius: 16, border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
            >
              <option>GPT-4o</option>
              <option>GPT-4 Turbo</option>
              <option>Claude 3.5</option>
            </select>

            {/* MIC BUTTON */}
            {micSupported && (
              <button
                onClick={toggleMic}
                title={isListening ? 'Stop recording (Esc)' : 'Start voice input'}
                aria-label={isListening ? 'Stop voice recording' : 'Start voice input'}
                aria-pressed={isListening}
                style={{
                  width: 32, height: 32, border: 'none', borderRadius: '50%',
                  background: isListening ? '#EF4444' : 'transparent',
                  color: isListening ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.18s ease', flexShrink: 0,
                  boxShadow: isListening ? '0 0 0 4px rgba(239,68,68,0.2)' : 'none',
                  animation: isListening ? 'mic-pulse 1.5s ease-in-out infinite' : 'none',
                }}
                onMouseEnter={e => {
                  if (!isListening) {
                    e.currentTarget.style.background = 'var(--surface-3)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isListening) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                {isListening ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <rect x="2" y="2" width="8" height="8" rx="1.5"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" x2="12" y1="19" y2="22"></line>
                  </svg>
                )}
              </button>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              aria-label="Send message"
              id="send-btn"
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none',
                background: canSend ? 'var(--blue)' : 'var(--surface-4)',
                color: canSend ? '#fff' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: canSend ? 'pointer' : 'not-allowed',
                flexShrink: 0, transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { if (canSend) { e.currentTarget.style.background = '#3B82F6'; e.currentTarget.style.transform = 'scale(1.05)'; } }}
              onMouseLeave={e => { if (canSend) { e.currentTarget.style.background = 'var(--blue)'; e.currentTarget.style.transform = 'scale(1)'; } }}
            >
              {disabled ? (
                <svg className="spin" width="16" height="16" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 10" opacity="0.8"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20"></path>
                  <path d="M5 9l7-7 7 7"></path>
                </svg>
              )}
            </button>
          </div>
        </div>
        </form>

        {/* Desktop disclaimer — hidden on mobile by CSS */}
        <p className="chat-input-disclaimer" style={{ fontSize: 11, color: 'var(--text-light)', textAlign: 'center', marginTop: 10 }}>
          AI Nexus may make mistakes. Always verify critical information with source documents.
        </p>
      </div>
    </div>
  );
}

/* ── Small helper components ─────────────────────────────────────────────── */

/** Animated waveform bars shown in the "Listening..." banner */
function MicWaveform() {
  const bars = [0.5, 1, 0.7, 1, 0.6, 0.9, 0.4];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 16 }}>
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3, height: 16 * h, borderRadius: 2,
            background: '#EF4444',
            animation: `bar-bounce ${0.6 + i * 0.08}s ease-in-out ${i * 0.07}s infinite`,
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </div>
  );
}
