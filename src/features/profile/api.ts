import { apiClient } from '../../api/client';
import {
  LocationSuggestion,
  ProfileData,
  ReverseGeocodeResult,
  UpdateProfilePayload,
  UpdateProfileResponse,
  UploadProfilePictureResponse,
} from './types';

export const profileApi = {
  getMyProfile: async (): Promise<ProfileData> => {
    const response = await apiClient.get('/profile');
    return response.data;
  },

  updateMyProfile: async (data: UpdateProfilePayload): Promise<UpdateProfileResponse> => {
    const response = await apiClient.patch('/profile', data);
    return response.data;
  },

  searchLocations: async (query: string): Promise<LocationSuggestion[]> => {
    const response = await apiClient.get<LocationSuggestion[]>('/geolocation/search', {
      params: { q: query },
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  reverseGeocode: async (
    latitude: number,
    longitude: number
  ): Promise<ReverseGeocodeResult> => {
    const response = await apiClient.get<ReverseGeocodeResult>('/geolocation/reverse', {
      params: { lat: latitude, lon: longitude },
    });
    return response.data;
  },

  uploadProfilePicture: async (
    fileUri: string,
    fileName: string,
    mimeType: string,
    onProgress?: (percent: number) => void
  ): Promise<UploadProfilePictureResponse> => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);

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
