import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validate = (): boolean => {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) { setEmailError('Email is required'); valid = false; }
    else if (!/\S+@\S+\.\S+/.test(email)) { setEmailError('Enter a valid email'); valid = false; }
    if (!password) { setPasswordError('Password is required'); valid = false; }

    return valid;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/chat', { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--color-primary)] shadow-elevation2 mb-4">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
          </div>
          <h1 className="text-h2 font-semibold text-[var(--color-text-primary)]">
            Welcome back
          </h1>
          <p className="text-body text-[var(--color-text-secondary)] mt-1">
            Sign in to College Assistant
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div
                className="p-3 bg-red-50 border border-red-200 rounded-sm text-[var(--color-error)] text-sm"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}

            <Input
              id="login-email"
              type="email"
              label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              placeholder="you@college.edu"
              autoComplete="email"
              autoFocus
            />

            <Input
              id="login-password"
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={passwordError}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            <Button
              id="login-submit"
              type="submit"
              fullWidth
              loading={loading}
              className="mt-2"
            >
              Sign in
            </Button>
          </form>
        </Card>

        <p className="text-center text-body text-[var(--color-text-secondary)] mt-6">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="text-[var(--color-primary)] font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
