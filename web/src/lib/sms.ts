import { config } from './config';

export async function sendSMS({ to, message }: { to: string; message: string }) {
  try {
    // If Kudisms token is configured, use Kudisms
    if (config.kudisms.token && config.kudisms.token !== 'test') {
      const formData = new FormData();
      formData.append('token', config.kudisms.token);
      formData.append('senderID', config.kudisms.senderId);
      formData.append('recipients', to);
      formData.append('message', message);

      const response = await fetch('https://my.kudisms.net/api/corporate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Kudisms API error: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Check Kudisms response status
      if (result.error_code !== '000') {
        throw new Error(`Kudisms error ${result.error_code}: ${result.msg || 'Unknown error'}`);
      }

      console.log(`[SMS] Sent via Kudisms to ${to} - Cost: ${result.cost}, Balance: ${result.balance}`);
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
