import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useAuthContext } from '../auth/context/AuthContext';
import { registerForPushNotifications } from './registerPush';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function handleNotificationData(data: Record<string, any> | undefined) {
  if (!data) return;
  const chatId = data.chatId;
  if (chatId) {
    router.push(`/chat/${chatId}`);
  }
}

export function NotificationsManager() {
  const { user } = useAuthContext();
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user?._id) return;
    if (registeredFor.current === user._id) return;
    registeredFor.current = user._id;
    registerForPushNotifications();
  }, [user?._id]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationData(response.notification.request.content.data as any);
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationData(response.notification.request.content.data as any);
      }
    });

    return () => sub.remove();
  }, []);

  return null;
}
