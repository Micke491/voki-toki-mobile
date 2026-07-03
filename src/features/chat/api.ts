import { apiClient } from '../../api/client';
import { ChatListItem, SearchUser } from './types';

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
};
