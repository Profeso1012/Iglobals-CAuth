import { config } from './config';

export async function sendSMS({ to, message }: { to: string; message: string }) {
  try {
    // If Termii API key is configured, use Termii
    if (config.termii.apiKey && config.termii.apiKey !== 'test') {
      const response = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          from: config.termii.senderId,
          sms: message,
          type: 'plain',
          channel: 'generic',
          api_key: config.termii.apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`Termii API error: ${response.statusText}`);
      }

      console.log(`[SMS] Sent via Termii to ${to}`);
      return true;
    }

    // Development mode: just log
    console.log(`[SMS] (dev mode) Would send to ${to}: ${message}`);
    return true;
  } catch (error) {
    console.error('[SMS] Failed to send:', error);
    throw error;
  }
}

export async function sendOTP(phone: string, otp: string) {
  return sendSMS({
    to: phone,
    message: `Your iGlobals verification code is: ${otp}. Valid for 10 minutes.`,
  });
}
