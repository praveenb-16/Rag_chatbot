import crypto from 'crypto';
import nodemailer from 'nodemailer';
import OtpRecord from '../models/OtpRecord';

const OTP_EXPIRES_MS =
  parseInt(process.env.OTP_EXPIRES_MINUTES || '10', 10) * 60 * 1000;

function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function buildHtml(otp: string): string {
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border:1px solid #E2E5EE;border-radius:12px;overflow:hidden;">
  <div style="background:#1B2B4B;padding:28px 32px;text-align:center;">
    <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0;">KIOT Assistant</h1>
    <p style="color:#8fa8c8;font-size:13px;margin:6px 0 0;">Email Verification</p>
  </div>
  <div style="padding:36px 32px;">
    <h2 style="color:#1A1F2E;font-size:18px;font-weight:600;margin:0 0 8px;">Your verification code</h2>
    <p style="color:#4B5568;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Enter this code to complete your signup. Expires in <strong>${process.env.OTP_EXPIRES_MINUTES || 10} minutes</strong>.
    </p>
    <div style="background:#F7F8FA;border:1.5px solid #E2E5EE;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;font-weight:800;letter-spacing:14px;color:#1B2B4B;font-family:monospace;">${otp}</div>
    </div>
    <p style="color:#8B96A8;font-size:12px;margin:0;">Do not share this code with anyone.</p>
  </div>
  <div style="background:#F7F8FA;border-top:1px solid #E2E5EE;padding:14px 32px;text-align:center;">
    <p style="color:#B4BCC9;font-size:11px;margin:0;">© ${new Date().getFullYear()} KIOT Assistant</p>
  </div>
</div>`;
}

/**
 * Sends OTP via Gmail SMTP (nodemailer).
 * server.ts sets dns.setDefaultResultOrder('ipv4first') so Gmail resolves to IPv4 on Render.
 */
export async function sendOTP(email: string): Promise<void> {
  const normalised = email.toLowerCase();
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MS);

  // Persist OTP before attempting delivery
  await OtpRecord.findOneAndUpdate(
    { email: normalised },
    { otp, expiresAt },
    { upsert: true, new: true }
  );

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    throw new Error('Email not configured. Set SMTP_USER and SMTP_PASS in your environment variables.');
  }

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);

  // Explicitly resolve to IPv4 — Render's free tier can't reach smtp.gmail.com via IPv6
  let resolvedHost = smtpHost;
  try {
    const { resolve4 } = await import('dns/promises');
    const [ipv4] = await resolve4(smtpHost);
    resolvedHost = ipv4;
    console.log(`[OTP] Resolved ${smtpHost} → ${resolvedHost} (IPv4)`);
  } catch (dnsErr) {
    console.warn(`[OTP] IPv4 DNS resolution failed, using hostname: ${dnsErr}`);
  }

  const transporter = nodemailer.createTransport({
    host: resolvedHost,
    port,
    secure: port === 465,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"KIOT Assistant" <${smtpUser}>`,
    to: normalised,
    subject: `${otp} — Your KIOT Assistant verification code`,
    html: buildHtml(otp),
    text: `Your KIOT verification code is: ${otp}\n\nExpires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.`,
  });

  console.log(`📧 OTP sent to ${normalised} via Gmail SMTP (expires ${expiresAt.toISOString()})`);
}

/** Verifies OTP — single atomic findOneAndDelete (prevents replay attacks). */
export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const record = await OtpRecord.findOneAndDelete({
    email: email.toLowerCase(),
    otp: otp.trim(),
    expiresAt: { $gt: new Date() },
  });
  return record !== null;
}

/** Rate-limit guard — check if a non-expired OTP already exists. */
export async function hasActiveOTP(email: string): Promise<boolean> {
  const count = await OtpRecord.countDocuments({
    email: email.toLowerCase(),
    expiresAt: { $gt: new Date() },
  });
  return count > 0;
}
