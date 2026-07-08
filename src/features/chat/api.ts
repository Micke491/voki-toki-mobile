import { apiClient } from '../../api/client';
import { ChatDetails, ChatListItem, Message, MessagesResponse, SearchUser } from './types';

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
  }): Promise<{ message: Message }> => {
    const response = await apiClient.post('/chat/message', payload);
    return response.data;
  },

  markMessagesSeen: async (chatId: string, messageIds: string[]): Promise<void> => {
    if (messageIds.length === 0) return;
    await apiClient.post(`/chat/message/messages/${messageIds[0]}/status`, {
      chatId,
      messageIds,
      status: 'seen',
    });
  },

  uploadChatMedia: async (
    fileUri: string,
    fileName: string,
    mimeType: string,
    onProgress?: (percent: number) => void
  ): Promise<{ url: string; mediaType: string; publicId: string }> => {
    const formData = new FormData();
    // @ts-ignore - React Native FormData file shape
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    });

    const response = await apiClient.post('/chat/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    });
    return response.data;
  },

  listMedia: async (chatId: string): Promise<any[]> => {
    const response = await apiClient.get(`/chat/media/list?chatId=${chatId}`);
    return response.data;
  },

  // Advanced Web Parity APIs
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

  addReaction: async (messageId: string, emoji: string): Promise<void> => {
    await apiClient.post(`/chat/message/${messageId}/reaction`, { emoji });
  },

  removeReaction: async (messageId: string, emoji: string): Promise<void> => {
    await apiClient.delete(`/chat/message/${messageId}/reaction`, { data: { emoji } });
  },

  deleteMessage: async (messageId: string, forEveryone: boolean = false): Promise<void> => {
    await apiClient.delete(`/chat/message/${messageId}?forEveryone=${forEveryone}`);
  },

  deleteMessageForEveryone: async (messageId: string): Promise<void> => {
    await apiClient.delete(`/chat/message/${messageId}?forEveryone=true`);
  },

  editMessage: async (messageId: string, text: string): Promise<{ message: Message }> => {
    const response = await apiClient.put(`/chat/message/${messageId}`, { text });
    return response.data;
  },

  pinMessage: async (messageId: string): Promise<void> => {
    await apiClient.post(`/chat/message/${messageId}/pin`);
  },

  unpinMessage: async (messageId: string): Promise<void> => {
    await apiClient.post(`/chat/message/${messageId}/unpin`);
  },

  // Block & Report APIs
  blockUser: async (targetUserId: string): Promise<void> => {
    await apiClient.post('/users/block', { targetUserId });
  },

  reportUser: async (targetId: string, targetType: string, category: string, details?: string): Promise<void> => {
    await apiClient.post('/reports', { targetId, targetType, category, details });
  },

  // Call APIs
  initiateCall: async (payload: { call_id: string; caller_id: string; callee_id: string; call_type: string; caller_name: string; caller_avatar?: string; chat_id: string; }): Promise<{ token: string }> => {
    const response = await apiClient.post('/call/initiate', payload);
    return response.data;
  },
  
  acceptCall: async (callId: string, userId: string): Promise<{ token: string }> => {
    const response = await apiClient.post('/call/accept', { call_id: callId, user_id: userId });
    return response.data;
  },
  
  rejectCall: async (callId: string, userId: string): Promise<void> => {
    await apiClient.post('/call/reject', { call_id: callId, user_id: userId });
  },
  
  endCall: async (callId: string, userId: string): Promise<void> => {
    await apiClient.post('/call/end', { call_id: callId, user_id: userId });
  },

  // Admin APIs
  removeParticipant: async (chatId: string, userId: string): Promise<void> => {
    await apiClient.post(`/chat/${chatId}/remove`, { userId });
  },
  
  changeAdmin: async (chatId: string, newAdminId: string): Promise<void> => {
    await apiClient.post(`/chat/${chatId}/admin`, { groupAdmin: newAdminId });
  },
  
  leaveGroup: async (chatId: string): Promise<void> => {
    await apiClient.post(`/chat/${chatId}/leave`);
  },

  createGroupChat: async (name: string, participantIds: string[]): Promise<ChatListItem> => {
    const response = await apiClient.post('/chats/group', { name, participants: participantIds });
    return response.data;
  },
};