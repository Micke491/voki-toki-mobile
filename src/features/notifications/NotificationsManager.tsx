import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState } from 'expo-router';
import { useAuthContext } from '../auth/context/AuthContext';
import { useCallContext } from '../calls/CallContext';
import { chatApi } from '../chat/api';
import { registerForPushNotifications } from './registerPush';
import { NotificationAction } from './categories';
import { getActiveChat } from './activeChat';
import { emitInAppNotification } from './inAppEvents';
import { dismissChatNotifications } from './dismiss';
import { refreshBadge } from './badge';
import { PushData } from './types';

const SILENT = {
  shouldShowBanner: false,
  shouldShowList: false,
  shouldPlaySound: false,
  shouldSetBadge: false,
};

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const content = notification.request.content;
    const data = (content.data ?? {}) as PushData;

    if (data.type === 'call') return SILENT;

    if (data.chatId && data.chatId === getActiveChat()) return SILENT;

    emitInAppNotification({
      chatId: data.chatId,
      title: content.title ?? '',
      body: content.body ?? '',
      data,
    });

    return SILENT;
  },
});

export function NotificationsManager() {
  const { user } = useAuthContext();
  const { joinCall } = useCallContext();
  const registeredFor = useRef<string | null>(null);

  const pendingRef = useRef<{ data: PushData; actionIdentifier: string } | null>(null);
  const navigationState = useRootNavigationState();
  const ready = !!navigationState?.key && !!user?._id;

  const markRead = useCallback(async (chatId?: string) => {
    if (!chatId) return;
    try {
      await chatApi.getMessages(chatId);
      await dismissChatNotifications(chatId);
      await refreshBadge();
    } catch {
      // The row is already gone from the tray; nothing useful to say.
    }
  }, []);

  const route = useCallback(
    (data: PushData, actionIdentifier: string) => {
      const chatId = data.chatId;

      switch (actionIdentifier) {
        case NotificationAction.MarkRead:
          markRead(chatId);
          return;
        case NotificationAction.Decline:
          if (data.callId && user?._id) {
            chatApi.rejectCall(data.callId, user._id).catch(() => {});
          }
          return;
        case NotificationAction.Reply:
          if (chatId) router.push(`/chat/${chatId}?focus=1`);
          return;
      }

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
        case 'missed_call': {
          if (chatId) router.push(`/chat/${chatId}`);
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
    [joinCall, markRead, user?._id]
  );

  const handleResponse = useCallback(
    (data: PushData | undefined, actionIdentifier: string) => {
      if (!data) return;
      if (!ready) {
        pendingRef.current = { data, actionIdentifier };
        return;
      }
      route(data, actionIdentifier);
    },
    [ready, route]
  );

  useEffect(() => {
    if (!ready || !pendingRef.current) return;
    const pending = pendingRef.current;
    pendingRef.current = null;
    route(pending.data, pending.actionIdentifier);
  }, [ready, route]);

  useEffect(() => {
    if (!user?._id) return;
    if (registeredFor.current === user._id) return;
    registeredFor.current = user._id;
    registerForPushNotifications();
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) return;

    refreshBadge();

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refreshBadge();
    });
    return () => sub.remove();
  }, [user?._id]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleResponse(
        response.notification.request.content.data as PushData,
        response.actionIdentifier
      );
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleResponse(
          response.notification.request.content.data as PushData,
          response.actionIdentifier
        );
      }
    });

    return () => sub.remove();
  }, [handleResponse]);

  return null;
}
