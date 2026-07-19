import { apiClient } from '../../api/client';
import { User } from '../../types';

export interface LoginResponse {
  token: string;
  user: User;
  requires_2fa?: boolean;
  temp_token?: string;
  trusted_device_token?: string;
}

export const authApi = {
  login: async (data: any): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },
  
  verify2FA: async (data: any): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/2fa/verify-login', data);
    return response.data;
  },
  
  register: async (data: any) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  requestPasswordReset: async (data: { email: string }) => {
    const response = await apiClient.post('/auth/password-reset-request', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    const response = await apiClient.get('/users/current_user');
    return response.data;
  }
};