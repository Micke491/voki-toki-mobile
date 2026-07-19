import { apiClient } from '../../api/client';
import { User } from '../../types';

export interface BlockedUser {
  _id: string;
  username: string;
  name?: string;
  avatar?: string;
}

export interface MutedChatEntry {
  chatId: string;
  mutedUntil: string;
}

export const settingsApi = {
  updatePreferences: async (data: Partial<User>): Promise<{ user: User }> => {
    const response = await apiClient.patch('/users/preferences', data);
    return response.data;
  },

  getActiveSessions: async (): Promise<{ sessions: any[] }> => {
    const response = await apiClient.get('/users/sessions');
    return response.data;
  },

  revokeSession: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/users/sessions/${id}`);
    return response.data;
  },

  requestEnable2FA: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/2fa/request-enable');
    return response.data;
  },

  confirmEnable2FA: async (code: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/2fa/confirm-enable', { code });
    return response.data;
  },

  disable2FA: async (password: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/2fa/disable', { password });
    return response.data;
  },

  requestPasswordReset: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/password-reset-request', { email });
    return response.data;
  },

  getBlockedUsers: async (): Promise<{ blockedUsers: BlockedUser[] }> => {
    const response = await apiClient.get('/users/blocked');
    return response.data;
  },

  unblockUser: async (targetUserId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete('/users/block', { data: { targetUserId } });
    return response.data;
  },

  getMutedChats: async (): Promise<{ mutedChats: MutedChatEntry[] }> => {
    const response = await apiClient.get('/chats/muted');
    return response.data;
  },

  unmuteChat: async (chatId: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/chats/unmute?chatId=${chatId}`);
    return response.data;
  },
};
