import { useEffect, useState, useMemo } from 'react';
import { chatApi } from '../api';
import { ChatDetails } from '../types';

export function useChatDetails(chatId: string | undefined, currentUserId: string | undefined) {
  const [chat, setChat] = useState<ChatDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId) {
      setChat(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

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

  const displayName = useMemo(() => {
    if (!chat) return 'Chat';
    if (chat.isGroupChat) return chat.name || 'Group';
    const other = chat.participants.find(p => p._id !== currentUserId);
    return other?.username || 'Unknown';
  }, [chat, currentUserId]);

  const isGroup = !!chat?.isGroupChat;

  return { chat, loading, error, displayName, isGroup };
}
