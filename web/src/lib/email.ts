import nodemailer from 'nodemailer';
import { config } from './config';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return transporter;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
      text,
    });
    console.log(`[EMAIL] Sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send:', error);
    throw error;
  }
}
