import { apiClient } from '../../api/client';
import { BotChat, BotMessage } from './types';

export const botApi = {
  getChats: async (): Promise<{ chats: BotChat[] }> => {
    const response = await apiClient.get('/bot/chats');
    return response.data;
  },

  createChat: async (initialMessage?: string): Promise<BotChat> => {
    const response = await apiClient.post('/bot/chats', { initialMessage });
    return response.data;
  },

  getChat: async (id: string): Promise<BotChat> => {
    const response = await apiClient.get(`/bot/chats/${id}`);
    return response.data;
  },

  sendMessage: async (id: string, text: string): Promise<{ message: BotMessage }> => {
    const response = await apiClient.post(`/bot/chats/${id}/message`, { text });
    return response.data;
  },

  deleteChat: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/bot/chats/${id}`);
    return response.data;
  },

  renameChat: async (id: string, title: string): Promise<{ message: string }> => {
    const response = await apiClient.patch(`/bot/chats/${id}`, { title });
    return response.data;
  },

  pinChat: async (id: string, pinned: boolean): Promise<{ message: string }> => {
    const response = await apiClient.patch(`/bot/chats/${id}/pin`, { pinned });
    return response.data;
  },
};
