import crypto from 'crypto';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import OtpRecord from '../models/OtpRecord';

const OTP_EXPIRES_MS =
  parseInt(process.env.OTP_EXPIRES_MINUTES || '10', 10) * 60 * 1000;

/** Generate a cryptographically random 6-digit OTP */
function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/** Build the OTP email HTML */
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
 * Sends OTP via Resend (HTTP API — works on Render free tier) or falls back to nodemailer SMTP.
 */
export async function sendOTP(email: string): Promise<void> {
  const normalised = email.toLowerCase();
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MS);
  const html = buildHtml(otp);
  const subject = `${otp} — Your KIOT Assistant verification code`;
  const text = `Your KIOT Assistant verification code is: ${otp}\n\nExpires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.`;

  // Save OTP to DB
  await OtpRecord.findOneAndUpdate(
    { email: normalised },
    { otp, expiresAt },
    { upsert: true, new: true }
  );

  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey && resendKey !== 'your_resend_api_key') {
    // ── Resend HTTP API (recommended — no SMTP port blocking) ─────────────
    const resend = new Resend(resendKey);
    const fromEmail = process.env.RESEND_FROM || 'KIOT Assistant <onboarding@resend.dev>';

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: normalised,
      subject,
      html,
      text,
    });

    if (error) {
      throw new Error(`Resend delivery failed: ${error.message}`);
    }
  } else {
    // ── Fallback: nodemailer SMTP ─────────────────────────────────────────
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass || smtpUser.includes('your_gmail')) {
      throw new Error(
        'Email not configured. Set RESEND_API_KEY (recommended) or SMTP_USER + SMTP_PASS in your environment.'
      );
    }

    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user: smtpUser, pass: smtpPass },
      // Force IPv4 to avoid ENETUNREACH on IPv6-only servers
      tls: { family: 4 },
    } as any);

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"KIOT Assistant" <${smtpUser}>`,
      to: normalised,
      subject,
      html,
      text,
    });
  }

  console.log(`📧 OTP sent to ${normalised} (expires ${expiresAt.toISOString()})`);
}

/** Verifies OTP from MongoDB — single atomic findOneAndDelete operation. */
export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const normalised = email.toLowerCase();
  const record = await OtpRecord.findOneAndDelete({
    email: normalised,
    otp: otp.trim(),
    expiresAt: { $gt: new Date() },
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
