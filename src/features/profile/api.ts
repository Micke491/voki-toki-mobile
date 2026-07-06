import { apiClient } from '../../api/client';
import { ProfileData, UpdateProfilePayload } from './types';

export const profileApi = {
  getMyProfile: async (): Promise<ProfileData> => {
    const response = await apiClient.get('/profile');
    return response.data;
  },

  updateMyProfile: async (data: UpdateProfilePayload): Promise<{ message: string; user: any }> => {
    const response = await apiClient.patch('/profile', data);
    return response.data;
  },

  uploadProfilePicture: async (
    fileUri: string,
    fileName: string,
    mimeType: string,
    onProgress?: (percent: number) => void
  ): Promise<{ url: string; message: string }> => {
    const formData = new FormData();
    // @ts-ignore - React Native FormData file shape
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    });

    const response = await apiClient.post('/users/profile/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    });
    return response.data;
  },

  deleteAccount: async (): Promise<{ message: string }> => {
    const response = await apiClient.delete('/users/current_user');
    return response.data;
  },
};
