import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email address'); return;
    }
    setLoading(true); setError(null);
    try {
      // Reuse OTP endpoint — user gets OTP to reset password
      await authApi.sendOTP(email.trim().toLowerCase());
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email.');
    } finally { setLoading(false); }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    border: '1.5px solid var(--border)',
    borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
    background: 'var(--surface)', color: 'var(--text-primary)',
    outline: 'none', boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', padding: '24px 16px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 14, background: 'var(--navy)', boxShadow: '0 4px 16px rgba(27,43,75,0.2)', marginBottom: 16 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="7" stroke="#4A90D9" strokeWidth="1.5" fill="none"/>
              <circle cx="12" cy="12" r="2" fill="#4A90D9"/>
              <path d="M12 7v5l2.5 2.5" stroke="#4A90D9" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.4px', margin: '0 0 6px' }}>
            Reset your password
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: 0 }}>
            Enter your email and we'll send a verification code.
          </p>
        </div>

        {sent ? (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '20px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📧</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#166534', margin: '0 0 6px' }}>Check your email</p>
            <p style={{ fontSize: 13, color: '#15803D', margin: '0 0 16px', lineHeight: 1.6 }}>
              We sent a verification code to <strong>{email}</strong>.<br/>
              Use it to set a new password on the signup page.
            </p>
            <Link to="/signup" style={{ display: 'inline-block', padding: '9px 20px', background: 'var(--navy)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              Continue to signup →
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div role="alert" style={{ display: 'flex', gap: 8, padding: '10px 14px', marginBottom: 16, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, color: '#DC2626', fontSize: 13 }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="fp-email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Email address
                </label>
                <input
                  id="fp-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@kiot.ac.in"
                  autoFocus
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--blue)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '12px 20px',
                  background: loading ? 'var(--navy-mid)' : 'var(--navy)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                  cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.18s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading ? 'Sending…' : 'Send reset code'}
              </button>
            </form>
          </>
        )}

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 24 }}>
          <Link to="/login" style={{ color: 'var(--blue)', textDecoration: 'none' }}>← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
