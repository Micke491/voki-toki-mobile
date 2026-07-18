import { useEffect, useState, useRef, useCallback, SetStateAction } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { wsClient } from '../../../api/ws-client';
import { chatApi } from '../api';
import { Message } from '../types';

interface UseChatMessagesProps {
  chatId: string;
  currentUserId: string;
}

function dedupeMessages(messages: Message[]): Message[] {
  const seen = new Map<string, Message>();
  for (const msg of messages) {
    if (!msg?._id) continue;
    const existing = seen.get(msg._id);
    if (!existing || existing.status === 'sending' || existing.status === 'failed') {
      seen.set(msg._id, msg);
    }
  }
  return Array.from(seen.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function useChatMessages({ chatId, currentUserId }: UseChatMessagesProps) {
  const [messages, setMessagesState] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCountBelow, setUnreadCountBelow] = useState(0);
  const [showNewMessageBadge, setShowNewMessageBadge] = useState(false);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]); 
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const offlineQueueRef = useRef<any[]>([]);

  const loadOfflineQueue = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(`offline-queue-${chatId}`);
      if (stored) {
        offlineQueueRef.current = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load offline queue', e);
    }
  }, [chatId]);

  const updateOfflineStorage = useCallback(async (queue: any[]) => {
    try {
      await AsyncStorage.setItem(`offline-queue-${chatId}`, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to save offline queue', e);
    }
  }, [chatId]);

  useEffect(() => {
    loadOfflineQueue();
  }, [loadOfflineQueue]);

  const isNearBottomRef = useRef(true);

  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const setMessages = useCallback((value: SetStateAction<Message[]>) => {
    setMessagesState(prev => {
      const resolved = typeof value === 'function' ? value(prev) : value;
      return dedupeMessages(resolved);
    });
  }, []);

  const addReactionLocal = useCallback((messageId: string, reaction: { userId: string; emoji: string; createdAt: string; user?: { username: string; avatar?: string } }) => {
    setMessages(prev =>
      prev.map(m => {
        if (m._id !== messageId) return m;
        if (m.reactions?.some(r => r.userId === reaction.userId && r.emoji === reaction.emoji)) return m;
        return { ...m, reactions: [...(m.reactions || []), reaction] };
      })
    );
  }, [setMessages]);

  const removeReactionLocal = useCallback((messageId: string, userId: string, emoji: string) => {
    setMessages(prev =>
      prev.map(m =>
        m._id === messageId
          ? { ...m, reactions: (m.reactions || []).filter(r => !(r.userId === userId && r.emoji === emoji)) }
          : m
      )
    );
  }, [setMessages]);

  const toggleReaction = useCallback(async (message: Message, emoji: string, sender: { username: string; avatar?: string }) => {
    const reacted = message.reactions?.some(r => r.userId === currentUserId && r.emoji === emoji);

    if (reacted) {
      removeReactionLocal(message._id, currentUserId, emoji);
      try {
        await chatApi.removeReaction(message._id, chatId, emoji);
      } catch (err) {
        addReactionLocal(message._id, { userId: currentUserId, emoji, createdAt: new Date().toISOString(), user: sender });
        console.error('Failed to remove reaction', err);
      }
    } else {
      addReactionLocal(message._id, { userId: currentUserId, emoji, createdAt: new Date().toISOString(), user: sender });
      try {
        await chatApi.addReaction(message._id, chatId, emoji);
      } catch (err) {
        removeReactionLocal(message._id, currentUserId, emoji);
        console.error('Failed to add reaction', err);
      }
    }
  }, [chatId, currentUserId, addReactionLocal, removeReactionLocal]);

  const deleteMessageForEveryone = useCallback(async (messageId: string) => {
    try {
      await chatApi.deleteMessageForEveryone(messageId);
    } catch (error) {
      console.error('Error deleting message for everyone:', error);
    }
  }, []);

  const forwardMessage = useCallback(async (
    targetChatIds: string[],
    messageText: string,
    mediaUrl?: string,
    mediaType?: string
  ) => {
    if (!targetChatIds.length) return;
    
    try {
      const promises = targetChatIds.map(id =>
        chatApi.sendMessage({ chatId: id, senderId: currentUserId, text: messageText, mediaUrl, mediaType, isForwarded: true })
      );
      await Promise.all(promises);
    } catch (error) {
      console.error('Error forwarding message:', error);
      throw error;
    }
  }, [currentUserId]);

  const fetchMessages = useCallback(async (before?: string) => {
    try {
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable !== false;
      if (!isOnline) {
        setLoading(false);
        return;
      }
      if (!before) {
        setLoading(true);
        setMessages([]);

        chatApi.getPinnedMessages(chatId)
          .then((data) => {
            setPinnedMessages(data || []);
          })
          .catch((err) => {
            console.error('Failed to fetch pinned messages', err);
          });
      } else {
        setLoadingMore(true);
      }

      const data = await chatApi.getMessages(chatId, before);
      const newMessages = data.messages || [];

      if (before) {
        setMessages(prev => dedupeMessages([...newMessages, ...prev]));
      } else {
        setMessages(newMessages);

        const firstUnread = newMessages.find(
          (m: Message) =>
            m.sender?._id !== currentUserId &&
            !m.readBy?.some((r: any) => r.userId === currentUserId)
        );
        if (firstUnread) {
          setFirstUnreadId(firstUnread._id);
        } else {
          setFirstUnreadId(null);
        }
      }
      setHasMore(data.hasMore);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [chatId, currentUserId, setMessages]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    fetchMessages(messages[0].createdAt);
  }, [loadingMore, hasMore, messages, fetchMessages]);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = messagesRef.current
      .filter(m => m.sender?._id !== currentUserId && !m.readBy?.some(r => r.userId === currentUserId))
      .map(m => m._id);

    if (unreadIds.length === 0) return;

    try {
      await chatApi.markMessagesSeen(chatId, unreadIds);
      setMessages(prev =>
        prev.map(m =>
          unreadIds.includes(m._id)
            ? {
                ...m,
                status: 'seen',
                read: true,
                readBy: [
                  ...(m.readBy?.filter(r => r.userId !== currentUserId) || []),
                  { userId: currentUserId, readAt: new Date().toISOString() },
                ],
              }
            : m
        )
      );
    } catch {
      // silent
    }
  }, [chatId, currentUserId, setMessages]);

  const updateScrollPosition = useCallback((nearBottom: boolean) => {
    isNearBottomRef.current = nearBottom;
    setShowNewMessageBadge(!nearBottom);
    if (nearBottom) {
      setUnreadCountBelow(0);
    }
  }, []);

  const resetUnreadBelow = useCallback(() => {
    setUnreadCountBelow(0);
    setShowNewMessageBadge(false);
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      markAllAsRead();
    }
  }, [loading, chatId, messages.length, markAllAsRead]);

  useEffect(() => {
    wsClient.connect();
    const channel = wsClient.subscribe(`chat-${chatId}`);

    const onReceiveMessage = (message: Message) => {
      if (String(message.chatId) !== String(chatId)) return;

      const senderId = typeof message.sender === 'object' ? message.sender?._id : message.sender;
      const isOwnMessage = senderId === currentUserId;

      setMessages(prev => {
        if (prev.some(m => String(m._id) === String(message._id))) return prev;

        if (isOwnMessage) {
          const tempIndex = prev.findIndex(m =>
            (m._id.startsWith('temp-') || m.status === 'sending' || m.status === 'failed') &&
            m.text === message.text
          );
          if (tempIndex !== -1) {
            const updated = [...prev];
            updated[tempIndex] = message;
            return updated;
          }
        }

        return [...prev, message];
      });

      if (!isOwnMessage) {
        if (!isNearBottomRef.current) {
          setUnreadCountBelow(prev => prev + 1);
          setShowNewMessageBadge(true);
        }
        chatApi.markMessagesSeen(chatId, [message._id]).catch(() => {});
      }
    };

    const onMessageUpdated = (updatedMessage: Message) => {
      setMessages(prev =>
        prev.map(m => (String(m._id) === String(updatedMessage._id) ? { ...m, ...updatedMessage } : m))
      );
    };

    const onMessageDeleted = (data: { messageId: string }) => {
      setMessages(prev =>
        prev.map(m =>
          m._id === data.messageId
            ? { ...m, isDeletedForEveryone: true, text: 'This message was deleted', mediaUrl: undefined, mediaType: undefined }
            : m
        )
      );
    };

    const onMessagesRead = (data: { messageIds: string[]; userId: string }) => {
      setMessages(prev =>
        prev.map(m =>
          data.messageIds.includes(m._id)
            ? {
                ...m,
                status: 'seen',
                readBy: [
                  ...(m.readBy?.filter(r => r.userId !== data.userId) || []),
                  { userId: data.userId, readAt: new Date().toISOString() },
                ],
              }
            : m
        )
      );
    };

    const onMessagesDelivered = (data: { messageIds: string[]; userId: string }) => {
      setMessages(prev =>
        prev.map(m =>
          data.messageIds.includes(m._id) && m.status !== 'seen'
            ? {
                ...m,
                status: 'delivered',
              }
            : m
        )
      );
    };

    const onMessagePinned = (pinnedMessage: Message) => {
      setPinnedMessages([pinnedMessage]);
      setMessages(prev =>
        prev.map(m =>
          String(m._id) === String(pinnedMessage._id)
            ? { ...m, isPinned: true }
            : { ...m, isPinned: false }
        )
      );
    };

    const onMessageUnpinned = (data: { messageId: string }) => {
      setPinnedMessages(prev => prev.filter(m => String(m._id) !== String(data.messageId)));
      setMessages(prev =>
        prev.map(m =>
          String(m._id) === String(data.messageId)
            ? { ...m, isPinned: false }
            : m
        )
      );
    };

    const onReactionAdded = (data: { chatId: string; messageId: string; reaction: { userId: string; emoji: string; createdAt: string; user?: { username: string; avatar?: string } } }) => {
      addReactionLocal(data.messageId, data.reaction);
    };

    const onReactionRemoved = (data: { chatId: string; messageId: string; userId: string; emoji: string }) => {
      removeReactionLocal(data.messageId, data.userId, data.emoji);
    };

    const onUserTyping = (data: { username: string; userId: string }) => {
      if (String(data.userId) !== String(currentUserId)) {
        setTypingUsers((prev) => {
          if (prev.includes(data.username)) return prev;
          return [...prev, data.username];
        });
      }
    };

    const onUserStoppedTyping = (data: { username: string; userId: string }) => {
      setTypingUsers((prev) => prev.filter((u) => u !== data.username));
    };

    channel.bind('receive-message', onReceiveMessage);
    channel.bind('message-updated', onMessageUpdated);
    channel.bind('message-deleted', onMessageDeleted);
    channel.bind('messages-read', onMessagesRead);
    channel.bind('messages-delivered', onMessagesDelivered);
    channel.bind('message-pinned', onMessagePinned);
    channel.bind('message-unpinned', onMessageUnpinned);
    channel.bind('message-reaction-added', onReactionAdded);
    channel.bind('message-reaction-removed', onReactionRemoved);
    channel.bind('user-typing', onUserTyping);
    channel.bind('user-stopped-typing', onUserStoppedTyping);

    return () => {
      channel.unbind('receive-message', onReceiveMessage);
      channel.unbind('message-updated', onMessageUpdated);
      channel.unbind('message-deleted', onMessageDeleted);
      channel.unbind('messages-read', onMessagesRead);
      channel.unbind('messages-delivered', onMessagesDelivered);
      channel.unbind('message-pinned', onMessagePinned);
      channel.unbind('message-unpinned', onMessageUnpinned);
      channel.unbind('message-reaction-added', onReactionAdded);
      channel.unbind('message-reaction-removed', onReactionRemoved);
      channel.unbind('user-typing', onUserTyping);
      channel.unbind('user-stopped-typing', onUserStoppedTyping);
    };
  }, [chatId, currentUserId, setMessages, addReactionLocal, removeReactionLocal]);

  const sendMessage = useCallback(async (text: string, sender: Message['sender']) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      _id: tempId,
      chatId,
      sender,
      text: trimmed,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'sending',
    };

    setMessages(prev => [...prev, optimistic]);

    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable !== false;

    if (!isOnline) {
      offlineQueueRef.current.push({ tempId, text: trimmed });
      updateOfflineStorage(offlineQueueRef.current);
      return;
    }

    try {
      const { message } = await chatApi.sendMessage({
        chatId,
        senderId: currentUserId,
        text: trimmed,
      });
      setMessages(prev => prev.map(m => (m._id === tempId ? { ...message, status: 'sent' } : m)));
    } catch {
      offlineQueueRef.current.push({ tempId, text: trimmed });
      updateOfflineStorage(offlineQueueRef.current);
      setMessages(prev => prev.map(m => (m._id === tempId ? { ...m, status: 'failed' } : m)));
    }
  }, [chatId, currentUserId, setMessages, updateOfflineStorage]);

  const retryMessage = useCallback(async (message: Message) => {
    if (!message.text && !message.mediaUrl) return;

    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable !== false;
    if (!isOnline) return;

    setMessages(prev => prev.map(m => (m._id === message._id ? { ...m, status: 'sending' } : m)));

    try {
      if (message.text && !message.mediaUrl) {
        const { message: realMessage } = await chatApi.sendMessage({
          chatId,
          senderId: currentUserId,
          text: message.text,
        });
        setMessages(prev => prev.map(m => (m._id === message._id ? { ...realMessage, status: 'sent' } : m)));
      }
      
      offlineQueueRef.current = offlineQueueRef.current.filter(i => i.tempId !== message._id);
      updateOfflineStorage(offlineQueueRef.current);
    } catch {
      setMessages(prev => prev.map(m => (m._id === message._id ? { ...m, status: 'failed' } : m)));
    }
  }, [chatId, currentUserId, setMessages, updateOfflineStorage]);

  const sendMediaMessage = useCallback(async (
    media: { uri: string; fileName: string; mimeType: string; type: 'image' | 'video' | 'audio' | 'gif' | 'sticker' | 'call' },
    sender: Message['sender'],
    caption?: string
  ) => {
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      _id: tempId,
      chatId,
      sender,
      text: caption || '',
      mediaUrl: media.uri,
      mediaType: media.type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'sending',
    };

    setMessages(prev => [...prev, optimistic]);

    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable !== false;

    if (!isOnline) {
      offlineQueueRef.current.push({ tempId, text: caption, mediaUrl: media.uri, mediaType: media.type, mimeType: media.mimeType, fileName: media.fileName });
      updateOfflineStorage(offlineQueueRef.current);
      return;
    }

    try {
      const isExternalUrl = media.uri.startsWith('http://') || media.uri.startsWith('https://');
      const isGifOrSticker = media.type === 'gif' || media.type === 'sticker';

      let mediaUrl: string;
      let mediaType: string;
      let mediaPublicId: string | undefined;

      if (isGifOrSticker && isExternalUrl) {
        mediaUrl = media.uri;
        mediaType = media.type;
        mediaPublicId = undefined;
      } else {
        const uploaded = await chatApi.uploadChatMedia(media.uri, media.fileName, media.mimeType);
        mediaUrl = uploaded.url;
        mediaType = uploaded.mediaType;
        mediaPublicId = uploaded.publicId;
      }

      const { message } = await chatApi.sendMessage({
        chatId,
        senderId: currentUserId,
        text: caption || '',
        mediaUrl,
        mediaType: media.type === 'audio' ? 'audio' : mediaType,
        mediaPublicId,
      });
      setMessages(prev => prev.map(m => (m._id === tempId ? { ...message, status: 'sent' } : m)));
    } catch {
      offlineQueueRef.current.push({ tempId, text: caption, mediaUrl: media.uri, mediaType: media.type, mimeType: media.mimeType, fileName: media.fileName });
      updateOfflineStorage(offlineQueueRef.current);
      setMessages(prev => prev.map(m => (m._id === tempId ? { ...m, status: 'failed' } : m)));
    }
  }, [chatId, currentUserId, setMessages, updateOfflineStorage]);

  const retryOfflineQueue = useCallback(async () => {
    if (offlineQueueRef.current.length === 0) return;
    const queue = [...offlineQueueRef.current];
    
    for (const item of queue) {
      if (item.text && !item.mediaUrl) {
        try {
          const { message } = await chatApi.sendMessage({
            chatId,
            senderId: currentUserId,
            text: item.text,
          });
          setMessages(prev => prev.map(m => (m._id === item.tempId ? { ...message, status: 'sent' } : m)));
          offlineQueueRef.current = offlineQueueRef.current.filter(i => i.tempId !== item.tempId);
          await updateOfflineStorage(offlineQueueRef.current);
        } catch {}
      }
    }
  }, [chatId, currentUserId, setMessages, updateOfflineStorage]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isOnline = state.isConnected && state.isInternetReachable !== false;
      if (isOnline) {
        retryOfflineQueue();
        fetchMessages();
      }
    });
    return () => unsubscribe();
  }, [retryOfflineQueue, fetchMessages]);

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    sendMessage,
    retryMessage,
    sendMediaMessage,
    deleteMessageForEveryone,
    forwardMessage,
    toggleReaction,
    unreadCountBelow,
    showNewMessageBadge,
    firstUnreadId,
    updateScrollPosition,
    resetUnreadBelow,
    pinnedMessages, 
    typingUsers,
  };
}