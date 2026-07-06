import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { profileApi } from '../api';
import { UpdateProfilePayload } from '../types';
import { User, UserLink } from '../../../types';
import { useAuthContext } from '../../auth/context/AuthContext';

export function useEditProfile(initialUser: User | null) {
  const { updateUser } = useAuthContext();

  const [name, setName] = useState(initialUser?.name || '');
  const [username, setUsername] = useState(initialUser?.username || '');
  const [bio, setBio] = useState(initialUser?.bio || '');
  const [location, setLocation] = useState(initialUser?.location || '');
  const [gender, setGender] = useState(initialUser?.gender || '');
  const [links, setLinks] = useState<UserLink[]>(initialUser?.links || []);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pickAvatar = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const addLink = () => {
    setLinks([...links, { label: '', url: '' }]);
  };

  const updateLink = (index: number, field: 'label' | 'url', value: string) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    setLinks(updated);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const save = async (): Promise<boolean> => {
    try {
      setError(null);
      setSaving(true);

      let avatarUrl: string | undefined;

      // Upload new avatar if selected
      if (avatarUri) {
        const fileName = avatarUri.split('/').pop() || 'avatar.jpg';
        const ext = fileName.split('.').pop()?.toLowerCase();
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

        const uploadResult = await profileApi.uploadProfilePicture(
          avatarUri,
          fileName,
          mimeType,
          setUploadProgress
        );
        avatarUrl = uploadResult.url;
      }

      // Filter out empty links
      const validLinks = links.filter(l => l.label.trim() && l.url.trim());

      const payload: UpdateProfilePayload = {
        username: username.trim() || undefined,
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        location: location.trim() || null,
        gender: gender.trim() || null,
        links: validLinks,
      };

      if (avatarUrl) {
        payload.avatar = avatarUrl;
      }

      const result = await profileApi.updateMyProfile(payload);
      
      // Sync updated user to auth context
      if (result.user) {
        updateUser(result.user);
      }

      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save profile');
      return false;
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  return {
    name, setName,
    username, setUsername,
    bio, setBio,
    location, setLocation,
    gender, setGender,
    links, addLink, updateLink, removeLink,
    avatarUri, pickAvatar,
    saving, uploadProgress, error,
    save,
  };
}
