import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState } from 'expo-router';
import { useAuthContext } from '../auth/context/AuthContext';
import { useCallContext } from '../calls/CallContext';
import { registerForPushNotifications } from './registerPush';
import { PushData } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function NotificationsManager() {
  const { user } = useAuthContext();
  const { joinCall } = useCallContext();
  const registeredFor = useRef<string | null>(null);

  const pendingRef = useRef<PushData | null>(null);
  const navigationState = useRootNavigationState();
  const ready = !!navigationState?.key && !!user?._id;

  const route = useCallback(
    (data: PushData) => {
      const chatId = data.chatId;

      switch (data.type) {
        case 'call': {
          if (chatId) router.push(`/chat/${chatId}`);
          if (data.callId) {
            joinCall({
              callId: data.callId,
              chatId: chatId || '',
              type: data.callType === 'video' ? 'video' : 'voice',
              remoteName: data.callerName,
              remoteId: data.callerId,
            });
          }
          return;
        }
        case 'request': {
          router.push('/tabs?tab=requests');
          return;
        }
        default: {
          if (chatId) router.push(`/chat/${chatId}`);
        }
      }
    },
    [joinCall]
  );

  const handleResponse = useCallback(
    (data: PushData | undefined) => {
      if (!data) return;
      if (!ready) {
        pendingRef.current = data;
        return;
      }
      route(data);
    },
    [ready, route]
  );

  useEffect(() => {
    if (!ready || !pendingRef.current) return;
    const data = pendingRef.current;
    pendingRef.current = null;
    route(data);
  }, [ready, route]);

  useEffect(() => {
    if (!user?._id) return;
    if (registeredFor.current === user._id) return;
    registeredFor.current = user._id;
    registerForPushNotifications();
  }, [user?._id]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleResponse(response.notification.request.content.data as PushData);
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleResponse(response.notification.request.content.data as PushData);
      }
    });

    return () => sub.remove();
  }, [handleResponse]);

  return null;
}
