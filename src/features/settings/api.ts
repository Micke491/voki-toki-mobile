import { apiClient } from '../../api/client';
import { User } from '../../types';

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
  }
};
