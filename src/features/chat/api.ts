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
};
