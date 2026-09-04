import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authApi, ApiError } from '../lib/api';

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

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [otp, setOtp]           = useState('');
  const [showPw, setShowPw]     = useState(false);

  const [otpSent, setOtpSent]         = useState(false);
  const [otpSending, setOtpSending]   = useState(false);
  const [otpMsg, setOtpMsg]           = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const score = strengthScore(password);
  const { color: strengthColor } = strengthLabel(score);
  const allChecksPass = score === 5;
  const passwordsMatch = password === confirm && confirm.length > 0;

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
      setOtpCountdown(60);
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

  const inputStyle = (hasErr = false): React.CSSProperties => ({
    width: '100%', padding: '10px 14px',
    border: `1.5px solid ${hasErr ? '#FECACA' : 'var(--border)'}`,
    borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
    background: 'var(--surface)', color: 'var(--text-primary)',
    outline: 'none', boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  });

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', fontFamily: 'Inter, sans-serif', background: 'var(--surface-2)' }}>
      {/* ── Left panel (branding) ── */}
      <div className="login-brand-panel" style={{ flex: '0 0 420px', background: 'var(--navy-deep)', display: 'flex', flexDirection: 'column', padding: '48px 44px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(74,144,217,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(74,144,217,0.05)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'auto' }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(74,144,217,0.15)', border: '1px solid rgba(74,144,217,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="6.5" stroke="#4A90D9" strokeWidth="1.4" fill="none"/>
              <circle cx="11" cy="11" r="2" fill="#4A90D9"/>
              <path d="M11 7v4l2.5 2.5" stroke="#4A90D9" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>AI Nexus</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>KIOT Knowledge Assistant</div>
          </div>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.6px', lineHeight: 1.2, margin: '0 0 14px' }}>
            Join your institutional<br/>knowledge base
          </h2>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 0 32px' }}>
            Create an account to ask questions, explore documents, and find verified answers instantly.
          </p>
          {[
            { icon: '🔒', text: 'Secure, private conversations' },
            { icon: '⚡', text: 'Instant answers grounded in truth' },
            { icon: '📱', text: 'Access across all your devices' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
              <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', padding: '32px 24px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.5px', margin: '0 0 6px' }}>
              Create an account
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
              Join AI Nexus to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div role="alert" style={{ display: 'flex', gap: 8, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, color: '#DC2626', fontSize: 13 }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="signup-name" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Full name</label>
              <input id="signup-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" autoFocus style={inputStyle()} onFocus={e => { e.currentTarget.style.borderColor = 'var(--blue)'; }} onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }} />
            </div>

            <div>
              <label htmlFor="signup-email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Email address</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input id="signup-email" type="email" value={email} onChange={e => { setEmail(e.target.value); setOtpSent(false); setOtpMsg(''); }} placeholder="you@kiot.ac.in" style={{ ...inputStyle(), flex: 1 }} onFocus={e => { e.currentTarget.style.borderColor = 'var(--blue)'; }} onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }} />
                <button type="button" onClick={handleSendOTP} disabled={otpSending || otpCountdown > 0} style={{ flexShrink: 0, padding: '0 14px', borderRadius: 10, border: 'none', background: otpSending || otpCountdown > 0 ? 'var(--surface-3)' : 'var(--navy)', color: otpSending || otpCountdown > 0 ? 'var(--text-muted)' : '#fff', fontSize: 12.5, fontWeight: 600, cursor: otpSending || otpCountdown > 0 ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
                  {otpSending ? 'Sending…' : otpCountdown > 0 ? `Wait ${otpCountdown}s` : otpSent ? 'Resend' : 'Verify'}
                </button>
              </div>
              {otpMsg && <p style={{ fontSize: 12, marginTop: 4, color: otpMsg.includes('Verification') ? '#16A34A' : '#DC2626' }}>{otpMsg}</p>}
            </div>

            {/* OTP field — always visible so user can enter code immediately after it arrives */}
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <label htmlFor="signup-otp" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                Verification code
                {!otpSent && <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>(enter your email above and click Verify)</span>}
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="signup-otp"
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  disabled={!otpSent}
                  style={{
                    ...inputStyle(false),
                    flex: 1,
                    letterSpacing: '0.25em', fontSize: 20, fontWeight: 700, textAlign: 'center',
                    borderColor: otp.length === 6 ? '#22C55E' : 'var(--border)',
                    opacity: !otpSent ? 0.5 : 1,
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--blue)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = otp.length === 6 ? '#22C55E' : 'var(--border)'; }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-password" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input id="signup-password" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" style={{ ...inputStyle(), paddingRight: 40 }} onFocus={e => { e.currentTarget.style.borderColor = 'var(--blue)'; }} onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }} />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  {showPw ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/></svg>
                  )}
                </button>
              </div>
              {password.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= score ? strengthColor : 'var(--surface-4)', transition: 'background 0.2s' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {checks.map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                        <span style={{ color: c.test(password) ? '#22C55E' : 'var(--text-muted)' }}>{c.test(password) ? '✓' : '○'}</span>
                        <span style={{ color: c.test(password) ? '#16A34A' : 'var(--text-muted)' }}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="signup-confirm" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Confirm password</label>
              <input id="signup-confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" style={{ ...inputStyle(), borderColor: confirm.length > 0 ? (passwordsMatch ? '#22C55E' : '#EF4444') : 'var(--border)' }} onFocus={e => { e.currentTarget.style.borderColor = 'var(--blue)'; }} onBlur={e => { e.currentTarget.style.borderColor = confirm.length > 0 ? (passwordsMatch ? '#22C55E' : '#EF4444') : 'var(--border)'; }} />
              {confirm.length > 0 && !passwordsMatch && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>Passwords do not match</p>}
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 8, padding: '12px 20px', background: loading ? 'var(--navy-mid)' : 'var(--navy)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.18s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                    <path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Creating account…
                </>
              ) : 'Create account →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 24 }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 500, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
