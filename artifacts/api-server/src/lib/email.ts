import nodemailer from "nodemailer";
import { logger } from "./logger";

type ResetPasswordPayload = {
  email: string;
  resetUrl: string;
};

let transporter: nodemailer.Transporter | null | undefined;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter !== undefined) return transporter;

  const host = process.env.SMTP_HOST;
  const portValue = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !portValue || !user || !pass) {
    transporter = null;
    return transporter;
  }

  const port = Number(portValue);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a valid positive number.");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

export async function sendResetPasswordEmail({
  email,
  resetUrl,
}: ResetPasswordPayload): Promise<void> {
  const activeTransporter = getTransporter();
  const fromAddress = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  if (!activeTransporter || !fromAddress) {
    logger.warn(
      { email, resetUrl },
      "SMTP not configured. Password reset URL logged for development.",
    );

    if (process.env.NODE_ENV === "production") {
      throw new Error("Password reset email service is not configured.");
    }
    return;
  }

  await activeTransporter.sendMail({
    from: fromAddress,
    to: email,
    subject: "Reset your Formu password",
    text: `Reset your password by opening this link:\n\n${resetUrl}`,
    html: `<p>Reset your password by opening this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}

