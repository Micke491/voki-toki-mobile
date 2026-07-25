import * as Notifications from 'expo-notifications';

export const NotificationCategory = {
  MessageDirect: 'message_direct',
  MessageGroup: 'message_group',
  CallIncoming: 'call_incoming',
} as const;

export const NotificationAction = {
  Reply: 'reply',
  MarkRead: 'mark_read',
  Answer: 'answer',
  Decline: 'decline',
} as const;

const messageActions: Notifications.NotificationAction[] = [
  {
    identifier: NotificationAction.Reply,
    buttonTitle: 'Reply',
    options: { opensAppToForeground: true },
  },
  {
    identifier: NotificationAction.MarkRead,
    buttonTitle: 'Mark as read',
    options: { opensAppToForeground: false },
  },
];

const callActions: Notifications.NotificationAction[] = [
  {
    identifier: NotificationAction.Answer,
    buttonTitle: 'Answer',
    options: { opensAppToForeground: true },
  },
  {
    identifier: NotificationAction.Decline,
    buttonTitle: 'Decline',
    options: { opensAppToForeground: false, isDestructive: true },
  },
];

export async function registerNotificationCategories(): Promise<void> {
  try {
    await Promise.all([
      Notifications.setNotificationCategoryAsync(NotificationCategory.MessageDirect, messageActions),
      Notifications.setNotificationCategoryAsync(NotificationCategory.MessageGroup, messageActions),
      Notifications.setNotificationCategoryAsync(NotificationCategory.CallIncoming, callActions),
    ]);
  } catch (err) {
    console.warn('[push] Could not register notification categories:', err);
  }
}
