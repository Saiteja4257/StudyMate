import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

interface VerificationEmailParams {
  to: string;
  name: string;
  code: string;
  token: string;
}

const getFrontendUrl = (): string => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/+$/, "");
  }
  return process.env.NODE_ENV === "production"
    ? "https://studymate-8.vercel.app"
    : "http://localhost:5173";
};

const createTransporter = () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST;
  const service = process.env.SMTP_SERVICE;

  if (!user || !pass || (!host && !service)) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (service) {
    return nodemailer.createTransport({
      service,
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const sendVerificationEmail = async ({
  to,
  name,
  code,
  token,
}: VerificationEmailParams): Promise<{ delivered: boolean }> => {
  const verifyUrl = `${getFrontendUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(name || "there");
  const transporter = createTransporter();

  if (!transporter) {
    console.warn(
      "\n[EmailService] SMTP credentials not configured (SMTP_HOST/SMTP_SERVICE, SMTP_USER, SMTP_PASS). Logging verification details for development:"
    );
    console.log(`[DEV EMAIL VERIFICATION] To: ${to}`);
    console.log(`[DEV EMAIL VERIFICATION] 6-Digit Code: ${code}`);
    console.log(`[DEV EMAIL VERIFICATION] Verification Link: ${verifyUrl}\n`);
    return { delivered: false };
  }

  const from = process.env.SMTP_FROM || `"StudyMate AI" <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from,
    to,
    subject: "Verify your StudyMate AI email address",
    text: [
      `Hi ${name || "there"},`,
      "",
      "Thanks for signing up for StudyMate AI! Please verify your email address.",
      "",
      `Your 6-digit verification code: ${code}`,
      `Or click this link to verify: ${verifyUrl}`,
      "",
      "This code and link expire in 15 minutes.",
      "If you did not create a StudyMate AI account, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0f1117; color: #e5e7eb; border-radius: 16px; border: 1px solid #1f2937;">
        <h2 style="margin: 0 0 8px; color: #ffffff; font-size: 22px;">Verify your email</h2>
        <p style="margin: 0 0 24px; color: #9ca3af; font-size: 15px; line-height: 1.5;">
          Hi ${safeName}, enter this 6-digit code in StudyMate AI to verify your email address.
        </p>
        <div style="background: #181b24; border: 1px solid #374151; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #60a5fa; font-family: monospace;">${code}</span>
        </div>
        <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
          This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  return { delivered: true };
};
