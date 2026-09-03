import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User';
import { sendOTP, verifyOTP, hasActiveOTP } from '../services/otp.service';

const SALT_ROUNDS = 12;

// ── Password policy ────────────────────────────────────────────────────────
// Minimum 8 chars, at least one uppercase, one lowercase, one digit, one special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const PASSWORD_POLICY_MSG =
  'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character';

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(PASSWORD_REGEX, PASSWORD_POLICY_MSG),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

// ── JWT cookie helper ──────────────────────────────────────────────────────
function setTokenCookie(res: Response, userId: string, role: string): void {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const token = jwt.sign({ userId, role }, secret, { expiresIn } as jwt.SignOptions);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// ── POST /api/auth/send-otp ────────────────────────────────────────────────
/**
 * Step 1 of signup: send a 6-digit OTP to the provided email.
 * Rate-limited: won't send a new OTP if one is still active.
 */
export async function sendSignupOTP(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body as { email?: string };

    if (!email || typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email)) {
      res.status(400).json({ error: 'A valid email address is required' });
      return;
    }

    const normalised = email.trim().toLowerCase();

    // Check if email is already registered
    const existing = await User.findOne({ email: normalised });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    // Rate-limit: don't spam
    if (await hasActiveOTP(normalised)) {
      res.status(429).json({
        error: `An OTP was already sent. Please wait ${process.env.OTP_EXPIRES_MINUTES || 10} minutes before requesting a new one.`,
      });
      return;
    }

    // Send OTP — will throw if SMTP is not configured or delivery fails
    await sendOTP(normalised);

    res.json({ message: `Verification code sent to ${normalised}` });
  } catch (err) {
    console.error('OTP send error:', err);
    const message = err instanceof Error ? err.message : 'Failed to send verification email';
    res.status(500).json({ error: message });
  }
}

// ── POST /api/auth/signup ─────────────────────────────────────────────────
/**
 * Step 2 of signup: verify OTP + create account with encrypted password.
 * Password is hashed with bcrypt (12 rounds) before storing.
 */
export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { name, email, password, otp } = parsed.data;
    const normalised = email.toLowerCase();

    // Verify OTP
    const otpValid = await verifyOTP(normalised, otp);
    if (!otpValid) {
      res.status(400).json({ error: 'Invalid or expired OTP. Please request a new code.' });
      return;
    }

    // Re-check duplicate (race condition safety)
    const existing = await User.findOne({ email: normalised });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    // Hash password with bcrypt (12 rounds) — stored NEVER in plaintext
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name: name.trim(), email: normalised, passwordHash, role: 'student' });

    setTokenCookie(res, String(user._id), user.role);

    res.status(201).json({
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
}

// ── POST /api/auth/login ──────────────────────────────────────────────────
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email, password } = parsed.data;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    setTokenCookie(res, String(user._id), user.role);
    res.json({
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch {
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}

// ── POST /api/auth/logout ─────────────────────────────────────────────────
export function logout(_req: Request, res: Response): void {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.json({ success: true });
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────
export function me(req: Request, res: Response): void {
  const user = req.user!;
  res.json({
    user: { _id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
  });
}
