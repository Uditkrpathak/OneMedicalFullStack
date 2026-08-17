import { sendPushNotification } from '../notifications/providers/pushProvider.js';
import { sendEmailNotification } from '../notifications/providers/emailProvider.js';
import { sendSmsNotification } from '../notifications/providers/smsProvider.js';

export const sendPush = async ({ fcmToken, token, title, body, data = {}, userId }) => {
  const targetToken = token || fcmToken;
  const deviceTokens = targetToken ? [{ token: targetToken, provider: targetToken.startsWith('Expo') ? 'expo' : 'fcm' }] : [];
  return await sendPushNotification({
    deviceTokens,
    title,
    body,
    data,
    userId,
  });
};

export const sendSms = async ({ phone, message }) => {
  return await sendSmsNotification({
    phone,
    message,
  });
};

export const sendEmail = async ({ email, subject, text, html }) => {
  return await sendEmailNotification({
    to: email,
    subject,
    text,
    html,
  });
};
