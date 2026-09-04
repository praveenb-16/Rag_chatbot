import crypto from 'crypto';
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
 * Sends OTP via Brevo HTTP API (no SMTP ports — works on Render free tier).
 * Render blocks outbound SMTP (ports 25/465/587), so we must use an HTTP email API.
 *
 * Setup: https://app.brevo.com → sign in → SMTP & API → API Keys → Create key
 * Then add as BREVO_API_KEY in Render environment.
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

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error(
      'BREVO_API_KEY is not set. Add it in Render → Environment. Get one free at https://app.brevo.com'
    );
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER;
  if (!senderEmail) {
    throw new Error('Set BREVO_SENDER_EMAIL (or SMTP_USER) in Render environment to use as the sender address.');
  }

  console.log(`[OTP] Sending via Brevo HTTP API to ${normalised} from ${senderEmail}`);

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'KIOT Assistant', email: senderEmail },
      to: [{ email: normalised }],
      subject: `${otp} — Your KIOT Assistant verification code`,
      htmlContent: buildHtml(otp),
      textContent: `Your KIOT Assistant verification code is: ${otp}\n\nExpires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.`,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Brevo API error ${res.status}: ${JSON.stringify(body)}`);
  }

  console.log(`[OTP] ✅ Sent to ${normalised} via Brevo (expires ${expiresAt.toISOString()})`);
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
