import { useState, useCallback } from 'react';
import { storyApi } from '../api';
import { PickedMedia } from '../../chat/hooks/useMediaPicker';

export function useCreateStory(onSuccess?: () => void) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const postStory = useCallback(async (media: PickedMedia, caption?: string) => {
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      await storyApi.createStory(media.uri, media.fileName, media.mimeType, caption, setProgress);
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to post story');
      throw err;
    } finally {
      setUploading(false);
    }
  }, [onSuccess]);

  return { postStory, uploading, progress, error };
}