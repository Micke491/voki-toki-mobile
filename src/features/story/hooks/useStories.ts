import { useState, useEffect, useCallback } from 'react';
import { storyApi } from '../api';
import { StoryGroup } from '../types';

export function useStories() {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await storyApi.getAllStories();
      setStoryGroups(data.stories || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const markViewed = useCallback(async (userId: string, storyId: string) => {
    try {
      await storyApi.markStoryViewed(userId, storyId);
      setStoryGroups(prev =>
        prev.map(g =>
          g.user._id === userId
            ? { ...g, stories: g.stories.map(s => (s._id === storyId ? { ...s, viewed: true } : s)) }
            : g
        )
      );
    } catch {
      // silent
    }
  }, []);

  return { storyGroups, loading, error, fetchStories, markViewed };
}