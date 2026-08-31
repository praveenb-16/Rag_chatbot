import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authApi, ApiError } from '../lib/api';

// ── Password policy checks ─────────────────────────────────────────────────
const checks = [
  { id: 'len',     label: 'At least 8 characters',        test: (p: string) => p.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter (A–Z)',    test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'One lowercase letter (a–z)',    test: (p: string) => /[a-z]/.test(p) },
  { id: 'digit',   label: 'One number (0–9)',              test: (p: string) => /\d/.test(p) },
  { id: 'special', label: 'One special character (!@#…)',  test: (p: string) => /[^A-Za-z\d]/.test(p) },
];

function strengthScore(password: string): number {
  return checks.filter(c => c.test(password)).length;
}
function strengthLabel(score: number) {
  if (score <= 1) return { text: 'Weak',      color: '#EF4444' };
  if (score <= 3) return { text: 'Fair',      color: '#F59E0B' };
  if (score === 4) return { text: 'Good',     color: '#3B82F6' };
  return               { text: 'Strong',     color: '#22C55E' };
}

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  // Form fields
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [otp, setOtp]           = useState('');
  const [showPw, setShowPw]     = useState(false);

  // OTP state
  const [otpSent, setOtpSent]         = useState(false);
  const [otpSending, setOtpSending]   = useState(false);
  const [otpMsg, setOtpMsg]           = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Submit state
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const score = strengthScore(password);
  const { text: strengthText, color: strengthColor } = strengthLabel(score);
  const allChecksPass = score === 5;
  const passwordsMatch = password === confirm && confirm.length > 0;

  // ── Send OTP ──────────────────────────────────────────────────────────────
  const handleSendOTP = async () => {
    setOtpMsg('');
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setOtpMsg('Enter a valid email address first.');
      return;
    }
    setOtpSending(true);
    try {
      const res = await authApi.sendOTP(email.trim().toLowerCase());
      setOtpSent(true);
      setOtpMsg(res.message);
      // 10-min countdown
      let secs = parseInt(process.env.OTP_EXPIRES_MINUTES || '10', 10) * 60;
      // use 60s for UX re-send cooldown
      secs = 60;
      setOtpCountdown(secs);
      const timer = setInterval(() => {
        setOtpCountdown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setOtpMsg(err instanceof ApiError ? err.message : 'Failed to send OTP. Try again.');
    } finally {
      setOtpSending(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim())         { setError('Full name is required'); return; }
    if (!email.trim())        { setError('Email is required'); return; }
    if (!allChecksPass)       { setError('Password does not meet the requirements'); return; }
    if (!passwordsMatch)      { setError('Passwords do not match'); return; }
    if (!otpSent)             { setError('Please verify your email with OTP first'); return; }
    if (otp.trim().length !== 6) { setError('Enter the 6-digit OTP sent to your email'); return; }

    setLoading(true);
    try {
      await signup(name.trim(), email.trim().toLowerCase(), password, otp.trim());
      navigate('/chat', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inputStyle = (hasErr = false): React.CSSProperties => ({
    width: '100%', padding: '10px 12px',
    border: `1.5px solid ${hasErr ? 'var(--red, #EF4444)' : 'var(--border, #E2E5EE)'}`,
    borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
    color: 'var(--text-primary, #1A1F2E)', outline: 'none', background: '#fff',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  });
  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #1A1F2E)',
    display: 'block', marginBottom: 5,
  };
  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 0 };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--surface-2, #F7F8FA)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'var(--navy, #1B2B4B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <circle cx="13" cy="13" r="9" stroke="#4A90D9" strokeWidth="1.6" fill="none"/>
              <circle cx="13" cy="13" r="2.5" fill="#4A90D9"/>
              <path d="M13 8v5l3.5 3.5" stroke="#4A90D9" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy, #1B2B4B)', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
            Create your account
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted, #8B96A8)', margin: 0 }}>
            Join KIOT Assistant
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', border: '1px solid var(--border, #E2E5EE)',
          borderRadius: 16, padding: '28px 32px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Global error */}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, fontSize: 13,
                background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626',
              }} role="alert">
                {error}
              </div>
            )}

            {/* Full name */}
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="signup-name">Full name</label>
              <input
                id="signup-name" type="text" value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Smith"
                autoComplete="name" autoFocus
                style={inputStyle()}
                onFocus={e => (e.target.style.borderColor = 'var(--blue, #4A90D9)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border, #E2E5EE)')}
              />
            </div>

            {/* Email + Send OTP */}
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="signup-email">Email address</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="signup-email" type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setOtpSent(false); setOtpMsg(''); }}
                  placeholder="you@college.edu"
                  autoComplete="email"
                  style={{ ...inputStyle(), flex: 1 }}
                  onFocus={e => (e.target.style.borderColor = 'var(--blue, #4A90D9)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border, #E2E5EE)')}
                />
                <button
                  type="button"
                  id="send-otp-btn"
                  onClick={handleSendOTP}
                  disabled={otpSending || otpCountdown > 0}
                  style={{
                    flexShrink: 0, padding: '0 14px', borderRadius: 10, border: 'none',
                    background: otpSending || otpCountdown > 0 ? 'var(--surface-3, #EFF1F5)' : 'var(--navy, #1B2B4B)',
                    color: otpSending || otpCountdown > 0 ? 'var(--text-muted, #8B96A8)' : '#fff',
                    fontSize: 12.5, fontWeight: 600, cursor: otpSending || otpCountdown > 0 ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s',
                  }}
                >
                  {otpSending ? 'Sending…' : otpCountdown > 0 ? `Resend (${otpCountdown}s)` : otpSent ? 'Resend OTP' : 'Verify Email'}
                </button>
              </div>
              {otpMsg && (
                <p style={{
                  fontSize: 12, marginTop: 5,
                  color: otpMsg.startsWith('Verification') ? '#16A34A' : '#DC2626',
                }}>
                  {otpMsg}
                </p>
              )}
            </div>

            {/* OTP input — shown after send */}
            {otpSent && (
              <div style={fieldStyle}>
                <label style={labelStyle} htmlFor="signup-otp">
                  Enter 6-digit OTP
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                    (sent to {email})
                  </span>
                </label>
                <input
                  id="signup-otp" type="text" inputMode="numeric"
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  maxLength={6}
                  style={{
                    ...inputStyle(),
                    letterSpacing: '0.35em', fontSize: 20, fontWeight: 700,
                    textAlign: 'center', fontFamily: 'monospace',
                    borderColor: otp.length === 6 ? '#22C55E' : 'var(--border)',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--blue, #4A90D9)')}
                  onBlur={e => (e.target.style.borderColor = otp.length === 6 ? '#22C55E' : 'var(--border)')}
                />
                {otp.length === 6 && (
                  <p style={{ fontSize: 11.5, color: '#16A34A', marginTop: 4 }}>
                    ✓ OTP entered — will be verified on submit
                  </p>
                )}
              </div>
            )}

            {/* Password */}
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="signup-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="signup-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  style={{ ...inputStyle(), paddingRight: 40 }}
                  onFocus={e => (e.target.style.borderColor = 'var(--blue, #4A90D9)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border, #E2E5EE)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: 4,
                  }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2"/>
                      <circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2"/>
                      <circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                  )}
                </button>
              </div>

              {/* Strength bar */}
              {password.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: i <= score ? strengthColor : 'var(--surface-4, #E5E8EF)',
                        transition: 'background 0.2s',
                      }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11.5, color: strengthColor, fontWeight: 600, margin: '0 0 6px' }}>
                    {strengthText}
                  </p>
                  {/* Checklist */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {checks.map(c => {
                      const pass = c.test(password);
                      return (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                          <span style={{ color: pass ? '#22C55E' : 'var(--text-muted)', lineHeight: 1 }}>
                            {pass ? '✓' : '○'}
                          </span>
                          <span style={{ color: pass ? '#16A34A' : 'var(--text-muted, #8B96A8)' }}>
                            {c.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="signup-confirm">Confirm password</label>
              <input
                id="signup-confirm" type="password" value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                style={{
                  ...inputStyle(),
                  borderColor: confirm.length > 0
                    ? passwordsMatch ? '#22C55E' : '#EF4444'
                    : 'var(--border)',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--blue, #4A90D9)')}
              />
              {confirm.length > 0 && !passwordsMatch && (
                <p style={{ fontSize: 11.5, color: '#DC2626', marginTop: 4 }}>Passwords do not match</p>
              )}
              {confirm.length > 0 && passwordsMatch && (
                <p style={{ fontSize: 11.5, color: '#16A34A', marginTop: 4 }}>✓ Passwords match</p>
              )}
            </div>

            {/* Security note */}
            <div style={{
              padding: '9px 12px', borderRadius: 8,
              background: 'var(--surface-2, #F7F8FA)', border: '1px solid var(--border)',
              fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.55,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M6.5 1L2 3.5v3.5C2 9.5 4 11.5 6.5 12 9 11.5 11 9.5 11 7V3.5L6.5 1z" stroke="currentColor" strokeWidth="1.1"/>
              </svg>
              Your password is encrypted with bcrypt before being stored. We never store plaintext passwords.
            </div>

            {/* Submit */}
            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                background: loading ? 'var(--surface-3)' : 'var(--navy, #1B2B4B)',
                color: loading ? 'var(--text-muted)' : '#fff',
                fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? (
                <>
                  <svg className="spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 10"/>
                  </svg>
                  Creating account…
                </>
              ) : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--text-muted)', marginTop: 20 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--blue, #4A90D9)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
