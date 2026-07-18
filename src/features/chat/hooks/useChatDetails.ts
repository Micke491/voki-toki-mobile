import { useEffect, useState, useMemo, useRef } from 'react';
import { chatApi } from '../api';
import { ChatDetails } from '../types';
import { wsClient } from '../../../api/ws-client';

export function useChatDetails(chatId: string | undefined, currentUserId: string | undefined) {
  const [chat, setChat] = useState<ChatDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Set when the current user is removed from / leaves the chat elsewhere.
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    if (!chatId) {
      setChat(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setRemoved(false);

    const fetchChat = async () => {
      try {
        setLoading(true);
        const data = await chatApi.getChatById(chatId);
        if (!cancelled) {
          setChat(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load chat');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchChat();
    return () => { cancelled = true; };
  }, [chatId]);

  // Live updates: participants added/removed, admin changed, avatar/name changed.
  // The backend broadcasts `chat-updated` on the chat channel and `chat-removed`
  // on the current user's channel (when this user is removed / leaves elsewhere).
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  useEffect(() => {
    if (!chatId) return;

    wsClient.connect();
    const chatChannel = wsClient.subscribe(`chat-${chatId}`);

    const normalizeAdmin = (admin: any): string | undefined => {
      if (!admin) return undefined;
      if (typeof admin === 'string') return admin;
      // bson.ObjectID can serialise as { $oid } or a hex string.
      return admin.$oid || admin.toString?.() || undefined;
    };

    const onChatUpdated = (data: any) => {
      if (!data) return;
      setChat(prev => {
        const base = prev || ({} as ChatDetails);
        return {
          ...base,
          _id: data._id || base._id,
          name: data.name !== undefined ? data.name : base.name,
          isGroupChat: data.isGroupChat !== undefined ? data.isGroupChat : base.isGroupChat,
          avatar: data.avatar !== undefined ? data.avatar : base.avatar,
          participants: Array.isArray(data.participants) ? data.participants : base.participants,
          groupAdmin: data.groupAdmin !== undefined ? normalizeAdmin(data.groupAdmin) : base.groupAdmin,
        };
      });
    };

    chatChannel.bind('chat-updated', onChatUpdated);

    // The `user-` channel is shared with other listeners, so only bind/unbind
    // our own handler — never unsubscribe the channel itself.
    const uid = currentUserIdRef.current;
    const userChannel = uid ? wsClient.subscribe(`user-${uid}`) : null;
    const onChatRemoved = (data: any) => {
      if (data?.chatId === chatId) {
        setRemoved(true);
      }
    };
    if (userChannel) userChannel.bind('chat-removed', onChatRemoved);

    return () => {
      chatChannel.unbind('chat-updated', onChatUpdated);
      if (userChannel) userChannel.unbind('chat-removed', onChatRemoved);
    };
  }, [chatId]);

  const displayName = useMemo(() => {
    if (!chat) return 'Chat';
    if (chat.isGroupChat) return chat.name || 'Group';
    const other = chat.participants.find(p => p._id !== currentUserId);
    return other?.username || 'Unknown';
  }, [chat, currentUserId]);

  const isGroup = !!chat?.isGroupChat;

  return { chat, loading, error, displayName, isGroup, removed, setChat };
}
