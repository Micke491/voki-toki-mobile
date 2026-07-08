import { useEffect, useState, useRef, useCallback, SetStateAction } from 'react';
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

  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const setMessages = useCallback((value: SetStateAction<Message[]>) => {
    setMessagesState(prev => {
      const resolved = typeof value === 'function' ? value(prev) : value;
      return dedupeMessages(resolved);
    });
  }, []);

  const deleteMessageForEveryone = useCallback(async (messageId: string) => {
    try {
      await chatApi.deleteMessageForEveryone(messageId);
      // Event listener will handle the update
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
        chatApi.sendMessage({ chatId: id, senderId: currentUserId, text: messageText, mediaUrl, mediaType })
      );
      await Promise.all(promises);
    } catch (error) {
      console.error('Error forwarding message:', error);
      throw error;
    }
  }, [currentUserId]);

  const fetchMessages = useCallback(async (before?: string) => {
    try {
      if (!before) {
        setLoading(true);
        setMessages([]);
      } else {
        setLoadingMore(true);
      }

      const data = await chatApi.getMessages(chatId, before);
      const newMessages = data.messages || [];

      if (before) {
        setMessages(prev => dedupeMessages([...newMessages, ...prev]));
      } else {
        setMessages(newMessages);
      }
      setHasMore(data.hasMore);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [chatId, setMessages]);

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

      setMessages(prev => {
        if (prev.some(m => String(m._id) === String(message._id))) return prev;

        const senderId = typeof message.sender === 'object' ? message.sender?._id : message.sender;
        if (senderId === currentUserId) {
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

      if (message.sender?._id !== currentUserId) {
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

    channel.bind('receive-message', onReceiveMessage);
    channel.bind('message-updated', onMessageUpdated);
    channel.bind('message-deleted', onMessageDeleted);
    channel.bind('messages-read', onMessagesRead);

    return () => {
      channel.unbind('receive-message', onReceiveMessage);
      channel.unbind('message-updated', onMessageUpdated);
      channel.unbind('message-deleted', onMessageDeleted);
      channel.unbind('messages-read', onMessagesRead);
    };
  }, [chatId, currentUserId, setMessages]);

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

    try {
      const { message } = await chatApi.sendMessage({
        chatId,
        senderId: currentUserId,
        text: trimmed,
      });
      setMessages(prev => prev.map(m => (m._id === tempId ? { ...message, status: 'sent' } : m)));
    } catch {
      setMessages(prev => prev.map(m => (m._id === tempId ? { ...m, status: 'failed' } : m)));
    }
  }, [chatId, currentUserId, setMessages]);

  const retryMessage = useCallback(async (message: Message) => {
    if (!message.text) return;
    setMessages(prev => prev.map(m => (m._id === message._id ? { ...m, status: 'sending' } : m)));

    try {
      const { message: realMessage } = await chatApi.sendMessage({
        chatId,
        senderId: currentUserId,
        text: message.text,
      });
      setMessages(prev => prev.map(m => (m._id === message._id ? { ...realMessage, status: 'sent' } : m)));
    } catch {
      setMessages(prev => prev.map(m => (m._id === message._id ? { ...m, status: 'failed' } : m)));
    }
  }, [chatId, currentUserId, setMessages]);

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

    try {
      // For GIFs/stickers with external URLs, skip upload and send directly
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
        mediaType,
        mediaPublicId,
      });
      setMessages(prev => prev.map(m => (m._id === tempId ? { ...message, status: 'sent' } : m)));
    } catch {
      setMessages(prev => prev.map(m => (m._id === tempId ? { ...m, status: 'failed' } : m)));
    }
  }, [chatId, currentUserId, setMessages]);

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
  };
}