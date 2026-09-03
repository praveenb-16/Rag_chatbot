import crypto from 'crypto';
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
 * Sends OTP email via Resend (HTTP API — no SMTP ports needed, works on Render free tier).
 * Falls back to nodemailer if RESEND_API_KEY is not set.
 */
export async function sendOTP(email: string): Promise<void> {
  const normalised = email.toLowerCase();
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MS);
  const html = buildHtml(otp);

  // Save OTP to DB first
  await OtpRecord.findOneAndUpdate(
    { email: normalised },
    { otp, expiresAt },
    { upsert: true, new: true }
  );

  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey && resendKey !== 'your_resend_api_key') {
    // ── Use Resend (HTTP API — no SMTP port issues) ────────────────────────
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);

    const fromEmail = process.env.RESEND_FROM || 'KIOT Assistant <onboarding@resend.dev>';

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: normalised,
      subject: `${otp} — Your KIOT Assistant verification code`,
      html,
      text: `Your KIOT Assistant verification code is: ${otp}\n\nExpires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.`,
    });

    if (error) {
      throw new Error(`Resend delivery failed: ${error.message}`);
    }
  } else {
    // ── Fallback: nodemailer SMTP ─────────────────────────────────────────
    const nodemailer = await import('nodemailer');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass || user.includes('your_gmail')) {
      throw new Error(
        'Email is not configured. Set RESEND_API_KEY (recommended) or SMTP_USER + SMTP_PASS in your environment.'
      );
    }

    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user, pass },
      family: 4, // force IPv4 — avoids ENETUNREACH on IPv6-only hosts
    } as nodemailer.TransportOptions);

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"KIOT Assistant" <${user}>`,
      to: normalised,
      subject: `${otp} — Your KIOT Assistant verification code`,
      html,
      text: `Your KIOT Assistant verification code is: ${otp}\n\nExpires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.`,
    });
  }

  console.log(`📧 OTP sent to ${normalised} (expires ${expiresAt.toISOString()})`);
}

/**
 * Verifies OTP from MongoDB — single atomic findOneAndDelete operation.
 */
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
