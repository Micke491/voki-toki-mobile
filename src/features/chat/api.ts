import { apiClient, API_BASE_URL } from '../../api/client';
import { Platform } from 'react-native';
import { getToken } from '../../utils/storage';
import { BlockStatus, ChatDetails, ChatListItem, Message, MessagesResponse, SearchUser, UserProfile } from './types';

export const chatApi = {
  getChats: async (): Promise<ChatListItem[]> => {
    const response = await apiClient.get('/chats');
    return response.data;
  },

  createChat: async (recipientId: string): Promise<ChatListItem> => {
    const response = await apiClient.post('/chats', { recipientId });
    return response.data;
  },

  deleteChat: async (chatId: string): Promise<void> => {
    await apiClient.delete(`/chats/${chatId}`);
  },

  searchUsers: async (query: string, page: number = 1, pageSize: number = 30): Promise<{ users: SearchUser[]; hasMore: boolean }> => {
    const response = await apiClient.get(`/users/search?username=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`);
    return response.data;
  },

  getSuggestedContacts: async (): Promise<{ contacts: SearchUser[] }> => {
    const response = await apiClient.get('/users/suggested-contacts');
    return response.data;
  },

  getRecommendedUsers: async (): Promise<{ users: SearchUser[] }> => {
    const response = await apiClient.get('/users/recommended');
    return response.data;
  },

  getChatById: async (chatId: string): Promise<ChatDetails> => {
    const response = await apiClient.get(`/chat/${chatId}`);
    return response.data;
  },

  getMessages: async (chatId: string, before?: string, limit = 30): Promise<MessagesResponse> => {
    let url = `/chat/message?chatId=${chatId}&limit=${limit}`;
    if (before) url += `&before=${encodeURIComponent(before)}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  sendMessage: async (payload: {
    chatId: string;
    senderId: string;
    text: string;
    replyTo?: string;
    mediaUrl?: string;
    mediaType?: string;
    mediaPublicId?: string;
    isForwarded?: boolean;
    storyId?: string;
    storyMediaUrl?: string;
    storyMediaType?: 'image' | 'video';
    storyCaption?: string;
    storyExpiresAt?: string;
  }): Promise<{ message: Message }> => {
    const response = await apiClient.post('/chat/message', payload);
    return response.data;
  },

  sendTypingStatus: async (chatId: string, username: string, isTyping: boolean): Promise<void> => {
    await apiClient.post('/chat/typing', { chatId, username, isTyping });
  },

  markMessagesSeen: async (chatId: string, messageIds: string[]): Promise<void> => {
    if (messageIds.length === 0) return;
    await apiClient.post(`/chat/message/messages/${messageIds[0]}/status`, {
      chatId,
      messageIds,
      status: 'seen',
    });
  },

  markMessagesDelivered: async (chatId: string, messageIds: string[]): Promise<void> => {
    if (messageIds.length === 0) return;
    await apiClient.post(`/chat/message/messages/${messageIds[0]}/status`, {
      chatId,
      messageIds,
      status: 'delivered',
    });
  },

  uploadChatMedia: async (
    fileUri: string,
    fileName: string,
    mimeType: string,
    onProgress?: (percent: number) => void
  ): Promise<{ url: string; mediaType: string; publicId: string }> => {
    const formData = new FormData();
    
    let localUri = fileUri;
    if (Platform.OS === 'android' && !localUri.startsWith('file://') && !localUri.startsWith('content://')) {
       localUri = 'file://' + localUri;
    }

    formData.append('file', {
      uri: localUri,
      name: fileName,
      type: mimeType,
    } as any);

    const token = await getToken();
    
    const response = await fetch(`${API_BASE_URL}/chat/media/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }
    const data = await response.json();
    return data;
  },

  listMedia: async (chatId: string): Promise<any[]> => {
    const response = await apiClient.get(`/chat/media/list?chatId=${chatId}`);
    return response.data;
  },

  getPinnedChats: async (): Promise<{ pinnedChats: string[] }> => {
    const response = await apiClient.get('/chats/pinned');
    return response.data;
  },

  getMutedChats: async (): Promise<{ mutedChats: any[] }> => {
    const response = await apiClient.get('/chats/muted');
    return response.data;
  },

  pinChat: async (chatId: string): Promise<void> => {
    await apiClient.post('/chats/pin', { chatId });
  },

  unpinChat: async (chatId: string): Promise<void> => {
    await apiClient.post(`/chats/unpin?chatId=${chatId}`);
  },

  muteChat: async (chatId: string, durationHours: number): Promise<void> => {
    await apiClient.post('/chats/mute', { chatId, durationHours });
  },

  unmuteChat: async (chatId: string): Promise<void> => {
    await apiClient.post(`/chats/unmute?chatId=${chatId}`);
  },

  getChatRequests: async (): Promise<ChatListItem[]> => {
    const response = await apiClient.get('/chats/requests');
    return response.data;
  },

  acceptChatRequest: async (chatId: string): Promise<void> => {
    await apiClient.post(`/chats/${chatId}/accept`);
  },

  rejectChatRequest: async (chatId: string): Promise<void> => {
    await apiClient.post(`/chats/${chatId}/reject`);
  },

  addReaction: async (messageId: string, chatId: string, emoji: string): Promise<void> => {
    await apiClient.post(`/chat/message/messages/${messageId}/reaction`, { emoji, chatId });
  },

  removeReaction: async (messageId: string, chatId: string, emoji: string): Promise<void> => {
    await apiClient.delete(`/chat/message/messages/${messageId}/reaction?chatId=${encodeURIComponent(chatId)}&emoji=${encodeURIComponent(emoji)}`);
  },

  deleteMessage: async (messageId: string, forEveryone: boolean = false): Promise<void> => {
    await apiClient.delete(`/chat/message/messages/${messageId}/delete?forEveryone=${forEveryone}`);
  },

  deleteMessageForEveryone: async (messageId: string): Promise<void> => {
    await apiClient.delete(`/chat/message/messages/${messageId}/delete?forEveryone=true`);
  },

  editMessage: async (messageId: string, text: string): Promise<{ message: Message }> => {
    const response = await apiClient.patch(`/chat/message/messages/${messageId}/edit`, { text });
    return response.data;
  },

  pinMessage: async (chatId: string, messageId: string): Promise<void> => {
    await apiClient.post(`/chat/${chatId}/pinned`, { messageId });
  },
  
  unpinMessage: async (chatId: string, messageId: string): Promise<void> => {
    await apiClient.delete(`/chat/${chatId}/pinned?messageId=${messageId}`);
  },

  getPinnedMessages: async (chatId: string): Promise<Message[]> => {
    const response = await apiClient.get(`/chat/${chatId}/pinned`);
    return response.data;
  },

  blockUser: async (targetUserId: string): Promise<void> => {
    await apiClient.post('/users/block', { targetUserId });
  },

  // Returns whether a block exists in either direction for a 1:1 chat.
  checkBlockStatus: async (chatId: string): Promise<BlockStatus> => {
    const response = await apiClient.get(`/users/block/check?chatId=${encodeURIComponent(chatId)}`);
    return response.data;
  },

  getUserProfile: async (userId: string): Promise<UserProfile> => {
    const response = await apiClient.get(`/profile/${userId}`);
    return response.data.user;
  },

  reportUser: async (targetId: string, targetType: string, category: string, details?: string): Promise<void> => {
    await apiClient.post('/reports', { targetId, targetType, category, details });
  },

  // Call APIs
  initiateCall: async (payload: { call_id: string; caller_id: string; callee_id: string; call_type: string; caller_name: string; caller_avatar?: string; chat_id: string; }): Promise<{ call_id: string; message: string }> => {
    const response = await apiClient.post('/call/initiate', payload);
    return response.data;
  },

  acceptCall: async (callId: string, userId: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/call/accept', { call_id: callId, user_id: userId });
    return response.data;
  },

  getIceServers: async (): Promise<{ iceServers: any[] }> => {
    const response = await apiClient.get('/call/ice-servers');
    return response.data;
  },
  
  rejectCall: async (callId: string, userId: string): Promise<void> => {
    await apiClient.post('/call/reject', { call_id: callId, user_id: userId });
  },
  
  endCall: async (callId: string, userId: string): Promise<void> => {
    await apiClient.post('/call/end', { call_id: callId, user_id: userId });
  },

  // Admin APIs
  removeParticipant: async (chatId: string, userId: string): Promise<ChatDetails> => {
    const response = await apiClient.post(`/chat/${chatId}/remove`, { userId });
    return response.data;
  },

  addParticipants: async (chatId: string, userIds: string[]): Promise<ChatDetails> => {
    const response = await apiClient.post(`/chat/${chatId}/add`, { userIds });
    return response.data;
  },
  
  changeAdmin: async (chatId: string, newAdminId: string): Promise<ChatDetails> => {
    // The backend has no /admin route; group admin is changed through the
    // generic group update endpoint (same as the web app).
    const response = await apiClient.patch(`/chat/${chatId}/update`, { groupAdmin: newAdminId });
    return response.data;
  },

  updateGroupInfo: async (chatId: string, payload: { name?: string; avatar?: string }): Promise<ChatDetails> => {
    const response = await apiClient.patch(`/chat/${chatId}/update`, payload);
    return response.data;
  },

  leaveGroup: async (chatId: string): Promise<void> => {
    await apiClient.post(`/chat/${chatId}/leave`);
  },

  createGroupChat: async (name: string, participantIds: string[], avatar?: string): Promise<ChatListItem> => {
    const payload: any = { name, participants: participantIds };
    if (avatar) payload.avatar = avatar;
    const response = await apiClient.post('/chats/GroupChat', payload);
    return response.data;
  },
};