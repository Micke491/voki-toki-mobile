import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { wsClient } from '../../../api/ws-client';
import { chatApi } from '../api';
import { ChatListItem, ChatParticipant } from '../types';

export function useChatList(currentUserId: string | undefined, selectedChatId?: string) {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [requests, setRequests] = useState<ChatListItem[]>([]);
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>([]);
  const [mutedChatIds, setMutedChatIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [blockConfirm, setBlockConfirm] = useState<{ chatId: string; userId: string; username: string } | null>(null);
  const [reportData, setReportData] = useState<{ userId: string; username: string } | null>(null);
  const [blocking, setBlocking] = useState(false);

  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const selectedChatIdRef = useRef(selectedChatId);
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      const [chatsData, requestsData, pinnedData, mutedData] = await Promise.all([
        chatApi.getChats().catch(() => []),
        chatApi.getChatRequests().catch(() => []),
        chatApi.getPinnedChats().catch(() => ({ pinnedChats: [] })),
        chatApi.getMutedChats().catch(() => ({ mutedChats: [] }))
      ]);
      
      const processedData = chatsData.map((c: ChatListItem) => 
        c._id === selectedChatIdRef.current ? { ...c, unreadCount: 0 } : c
      );
      
      setChats(processedData);
      setRequests(requestsData);
      setPinnedChatIds(pinnedData.pinnedChats || []);
      setMutedChatIds(mutedData.mutedChats ? mutedData.mutedChats.map((m: any) => m.chatId) : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchChats();
    } finally {
      setRefreshing(false);
    }
  }, [fetchChats]);

  // Initial fetch
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // WebSocket real-time events
  useEffect(() => {
    if (!currentUserId) return;

    // Connect WS and subscribe
    wsClient.connect();
    const channel = wsClient.subscribe(`user-${currentUserId}`);

    const onChatUpdate = (data: {
      chatId: string;
      lastMessage?: any;
      unreadCount?: number;
      name?: string;
      avatar?: string;
      participants?: ChatParticipant[];
    }) => {
      setChats(prevChats => {
        const existingChatIndex = prevChats.findIndex(c => c._id === data.chatId);
        if (existingChatIndex === -1) {
          // New chat we don't have, refetch
          fetchChats();
          return prevChats;
        }

        const existingChat = prevChats[existingChatIndex];
        const isCurrentChat = data.chatId === selectedChatIdRef.current;
        const amISender = data.lastMessage?.sender?._id === currentUserIdRef.current
          || data.lastMessage?.sender === currentUserIdRef.current;

        let newUnreadCount = existingChat.unreadCount || 0;

        if (isCurrentChat || amISender) {
          newUnreadCount = 0;
        } else if (data.unreadCount !== undefined) {
          newUnreadCount = data.unreadCount;
        } else if (data.lastMessage) {
          newUnreadCount += 1;
        }

        const updatedChat: ChatListItem = {
          ...existingChat,
          updatedAt: new Date().toISOString(),
          ...(data.name !== undefined && { name: data.name }),
          ...(data.avatar !== undefined && { avatar: data.avatar }),
          ...(data.participants !== undefined && { participants: data.participants }),
          lastMessage: data.lastMessage ? {
            _id: data.lastMessage._id,
            text: data.lastMessage.text,
            mediaUrl: data.lastMessage.mediaUrl,
            mediaType: data.lastMessage.mediaType,
            sender: data.lastMessage.sender,
            createdAt: data.lastMessage.createdAt,
            isSystemMessage: data.lastMessage.isSystemMessage,
            storyId: data.lastMessage.storyId,
            storyMediaUrl: data.lastMessage.storyMediaUrl,
            isDeletedForEveryone: data.lastMessage.isDeletedForEveryone,
          } : existingChat.lastMessage,
          unreadCount: newUnreadCount,
        };

        const otherChats = prevChats.filter((_, index) => index !== existingChatIndex);

        const shouldMoveToTop = !existingChat.lastMessage ||
          (data.lastMessage && new Date(data.lastMessage.createdAt) > new Date(existingChat.lastMessage.createdAt));

        if (!amISender && data.lastMessage?._id && !isCurrentChat) {
          chatApi.markMessagesDelivered(data.chatId, [data.lastMessage._id]).catch(err => console.error('Error marking delivered:', err));
        }

        if (shouldMoveToTop) {
          return [updatedChat, ...otherChats];
        } else {
          const newChats = [...prevChats];
          newChats[existingChatIndex] = updatedChat;
          return newChats;
        }
      });
    };

    const onChatRemoved = (data: { chatId: string }) => {
      setChats(prevChats => prevChats.filter(c => c._id !== data.chatId));
    };

    const onChatNew = (newChat: ChatListItem) => {
      setChats(prevChats => {
        if (prevChats.some(c => c._id === newChat._id)) return prevChats;
        return [newChat, ...prevChats];
      });
    };

    const onProfileUpdate = (data: { userId: string; username: string; avatar?: string }) => {
      setChats(prevChats => prevChats.map(chat => {
        if (chat.isGroupChat) return chat;
        const isParticipant = chat.participants.some(p => p._id === data.userId);
        if (!isParticipant) return chat;
        return {
          ...chat,
          participants: chat.participants.map(p =>
            p._id === data.userId
              ? { ...p, username: data.username, avatar: data.avatar }
              : p
          ),
        };
      }));
    };

    channel.bind('chat-update', onChatUpdate);
    channel.bind('chat-removed', onChatRemoved);
    channel.bind('chat-new', onChatNew);
    channel.bind('profile-updated', onProfileUpdate);

    return () => {
      channel.unbind('chat-update', onChatUpdate);
      channel.unbind('chat-removed', onChatRemoved);
      channel.unbind('chat-new', onChatNew);
      channel.unbind('profile-updated', onProfileUpdate);
    };
  }, [currentUserId, fetchChats]);

  const getOtherParticipant = useCallback((chat: ChatListItem) => {
    const other = chat.participants.find(p => p._id !== currentUserId);
    return other || { _id: '', username: 'Unknown', avatar: '', email: '' };
  }, [currentUserId]);

  const filteredChats = useMemo(() => {
    let sorted = [...chats].sort((a, b) => {
      const aPinned = pinnedChatIds.includes(a._id);
      const bPinned = pinnedChatIds.includes(b._id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

    return sorted.filter(chat => {
      if (!searchQuery) return true;
      const otherUser = getOtherParticipant(chat);
      const chatName = chat.isGroupChat ? chat.name : (otherUser?.username || 'Unknown');
      return chatName?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [chats, searchQuery, getOtherParticipant, pinnedChatIds]);

  const handleRemoveChat = useCallback(async (chatId: string) => {
    try {
      await chatApi.deleteChat(chatId);
      setChats(prev => prev.filter(c => c._id !== chatId));
    } catch (error) {
      console.error('Error removing chat:', error);
    }
  }, []);

  const handleAcceptRequest = useCallback(async (chatId: string) => {
    try {
      await chatApi.acceptChatRequest(chatId);
      const requestToAccept = requests.find(r => r._id === chatId);
      if (requestToAccept) {
        setChats(prev => [requestToAccept, ...prev]);
        setRequests(prev => prev.filter(r => r._id !== chatId));
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  }, [requests]);

  const handleRejectRequest = useCallback(async (chatId: string) => {
    try {
      await chatApi.rejectChatRequest(chatId);
      setRequests(prev => prev.filter(r => r._id !== chatId));
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  }, []);

  const handlePinChat = useCallback(async (chatId: string) => {
    try {
      await chatApi.pinChat(chatId);
      setPinnedChatIds(prev => [...prev, chatId]);
    } catch (error) {
      console.error('Error pinning chat:', error);
    }
  }, []);

  const handleUnpinChat = useCallback(async (chatId: string) => {
    try {
      await chatApi.unpinChat(chatId);
      setPinnedChatIds(prev => prev.filter(id => id !== chatId));
    } catch (error) {
      console.error('Error unpinning chat:', error);
    }
  }, []);

  const handleMuteChat = useCallback(async (chatId: string, durationHours: number = -1) => {
    try {
      await chatApi.muteChat(chatId, durationHours);
      setMutedChatIds(prev => [...prev, chatId]);
    } catch (error) {
      console.error('Error muting chat:', error);
    }
  }, []);

  const handleUnmuteChat = useCallback(async (chatId: string) => {
    try {
      await chatApi.unmuteChat(chatId);
      setMutedChatIds(prev => prev.filter(id => id !== chatId));
    } catch (error) {
      console.error('Error unmuting chat:', error);
    }
  }, []);

  const handleLeaveGroup = useCallback(async (chatId: string) => {
    try {
      await chatApi.leaveGroup(chatId);
      setChats(prev => prev.filter(c => c._id !== chatId));
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  }, []);

  const handleBlockUser = useCallback(async (targetUserId: string, chatId: string) => {
    setBlocking(true);
    try {
      await chatApi.blockUser(targetUserId);
      setChats(prev => prev.filter(c => c._id !== chatId));
    } catch (error) {
      console.error('Error blocking user:', error);
    } finally {
      setBlocking(false);
      setBlockConfirm(null);
    }
  }, []);

  return {
    chats,
    requests,
    pinnedChatIds,
    mutedChatIds,
    filteredChats,
    loading,
    refreshing,
    error,
    searchQuery,
    setSearchQuery,
    fetchChats,
    onRefresh,
    getOtherParticipant,
    handleRemoveChat,
    handleLeaveGroup,
    handleAcceptRequest,
    handleRejectRequest,
    handlePinChat,
    handleUnpinChat,
    handleMuteChat,
    handleUnmuteChat,
    handleBlockUser,
    blockConfirm,
    setBlockConfirm,
    reportData,
    setReportData,
    blocking,
  };
}
