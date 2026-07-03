import { apiClient } from '../../api/client';
import { StoryGroup } from './types';

export const storyApi = {
  getAllStories: async (): Promise<{ stories: StoryGroup[] }> => {
    const response = await apiClient.get('/stories');
    return response.data;
  },

  getUserStories: async (userId: string) => {
    const response = await apiClient.get(`/stories/${userId}`);
    return response.data;
  },

  markStoryViewed: async (userId: string, storyId: string): Promise<void> => {
    await apiClient.post(`/stories/${userId}`, { storyId });
  },

  createStory: async (
    fileUri: string,
    fileName: string,
    mimeType: string,
    caption?: string,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; story: any }> => {
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    });
    if (caption) formData.append('caption', caption);

    const response = await apiClient.post('/stories', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    });
    return response.data;
  },

  deleteMyStory: async (storyId: string): Promise<void> => {
    await apiClient.delete(`/profile?storyId=${storyId}`);
  },
};