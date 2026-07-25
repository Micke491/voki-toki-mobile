import * as Notifications from 'expo-notifications';
import { chatApi } from '../chat/api';

export async function refreshBadge(): Promise<void> {
  try {
    const chats = await chatApi.getChats();
    const total = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
    await Notifications.setBadgeCountAsync(total);
  } catch {
    // A stale badge is not worth surfacing to the user.
  }
}
