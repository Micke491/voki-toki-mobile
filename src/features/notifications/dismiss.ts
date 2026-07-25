import * as Notifications from 'expo-notifications';
import { callNotificationTag, chatNotificationTag, requestNotificationTag } from './types';

async function dismissTag(tag: string): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(tag);
  } catch {
    // The notification may already be gone; nothing to recover from.
  }
}

export async function dismissChatNotifications(chatId: string): Promise<void> {
  if (!chatId) return;
  await Promise.all([
    dismissTag(chatNotificationTag(chatId)),
    dismissTag(requestNotificationTag(chatId)),
  ]);
}

export async function dismissCallNotification(callId: string): Promise<void> {
  if (!callId) return;
  await dismissTag(callNotificationTag(callId));
}
