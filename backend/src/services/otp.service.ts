import nodemailer from 'nodemailer';
import crypto from 'crypto';
import OtpRecord from '../models/OtpRecord';

const OTP_EXPIRES_MS =
  parseInt(process.env.OTP_EXPIRES_MINUTES || '10', 10) * 60 * 1000;

// ── Fix 1: Create ONE persistent pooled transporter at startup ────────────
// pool:true keeps connections alive — no handshake overhead on every send
// port 465 + secure:true (SSL) is faster than 587 + STARTTLS
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: 465,           // SSL — faster than STARTTLS (587)
      secure: true,        // SSL from the start, no upgrade round-trip
      pool: true,          // keep connections alive between sends
      maxConnections: 3,
      maxMessages: 100,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 8000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    } as nodemailer.TransportOptions);

    // Warm up the connection pool immediately so first OTP is instant
    transporter.verify().catch(() => {
      // Silently ignore — will retry on first send
    });
  }
  return transporter;
}

/** Throw early if SMTP is not configured */
function assertSmtpConfigured(): void {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (
    !user || user.includes('your_gmail') ||
    !pass || pass.includes('your_gmail')
  ) {
    throw new Error(
      'SMTP is not configured. Please set SMTP_USER and SMTP_PASS in .env'
    );
  }
}

/** Generate a cryptographically random 6-digit OTP */
function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// Pre-build the static parts of the email HTML once
function buildHtml(otp: string): string {
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border:1px solid #E2E5EE;border-radius:12px;overflow:hidden;">
  <div style="background:#1B2B4B;padding:28px 32px;text-align:center;">
    <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0;">KIOT Assistant</h1>
    <p style="color:#8fa8c8;font-size:13px;margin:6px 0 0;">Enterprise Knowledge Assistant</p>
  </div>
  <div style="padding:36px 32px;">
    <h2 style="color:#1A1F2E;font-size:18px;font-weight:600;margin:0 0 8px;">Verify your email address</h2>
    <p style="color:#4B5568;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Use the code below to complete your signup. Expires in <strong>${process.env.OTP_EXPIRES_MINUTES || 10} minutes</strong>.
    </p>
    <div style="background:#F7F8FA;border:1.5px solid #E2E5EE;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;font-weight:800;letter-spacing:14px;color:#1B2B4B;font-family:monospace;">${otp}</div>
    </div>
    <p style="color:#8B96A8;font-size:12px;line-height:1.6;margin:0;">Do not share this code with anyone.</p>
  </div>
  <div style="background:#F7F8FA;border-top:1px solid #E2E5EE;padding:14px 32px;text-align:center;">
    <p style="color:#B4BCC9;font-size:11px;margin:0;">© ${new Date().getFullYear()} KIOT Assistant</p>
  </div>
</div>`;
}

/**
 * Sends OTP email.
 * Fix 2: DB upsert and SMTP send run IN PARALLEL (Promise.all) — cuts total
 *         time roughly in half vs doing them sequentially.
 * Fix 3: Transporter is reused (pooled) — no per-call connection setup.
 */
export async function sendOTP(email: string): Promise<void> {
  assertSmtpConfigured();

  const normalised = email.toLowerCase();
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MS);
  const html = buildHtml(otp);

  // ── Run DB save and email send simultaneously ────────────────────────────
  await Promise.all([
    // Upsert OTP record (creates or overwrites)
    OtpRecord.findOneAndUpdate(
      { email: normalised },
      { otp, expiresAt },
      { upsert: true, new: true }
    ),
    // Send email using pooled connection
    getTransporter().sendMail({
      from: process.env.SMTP_FROM || `"KIOT Assistant" <${process.env.SMTP_USER}>`,
      to: normalised,
      subject: `${otp} — Your KIOT Assistant verification code`,
      html,
      text: `Your KIOT Assistant verification code is: ${otp}\n\nExpires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.`,
    }),
  ]);

  console.log(`📧 OTP sent to ${normalised} (expires ${expiresAt.toISOString()})`);
}

/**
 * Verifies OTP from MongoDB using findOneAndDelete — single atomic operation
 * instead of separate find + delete, cutting verification time in half.
 */
export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const normalised = email.toLowerCase();

  // ── Fix 4: findOneAndDelete is ONE DB round-trip instead of two ──────────
  const record = await OtpRecord.findOneAndDelete({
    email: normalised,
    otp: otp.trim(),
    expiresAt: { $gt: new Date() },   // not expired
  });

  return record !== null;
}

/** Check if a non-expired OTP exists (for rate-limit guard). */
export async function hasActiveOTP(email: string): Promise<boolean> {
  const count = await OtpRecord.countDocuments({
    email: email.toLowerCase(),
    expiresAt: { $gt: new Date() },
  });
  return count > 0;
}

// ── Warm up at module load so the first request is instant ──────────────────
if (
  process.env.SMTP_USER &&
  !process.env.SMTP_USER.includes('your_gmail')
) {
  getTransporter(); // initialises pool and starts verify() in background
}
