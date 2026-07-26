import { apiClient } from '../../api/client';
import { Announcement } from '../../types';

export const announcementsApi = {
  list: async (): Promise<Announcement[]> => {
    const { data } = await apiClient.get('/announcements');
    return data.announcements || [];
  },

  dismiss: async (id: string): Promise<void> => {
    await apiClient.post(`/announcements/${id}/read`);
  },
};
