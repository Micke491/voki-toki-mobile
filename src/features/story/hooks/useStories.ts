import { useState, useEffect, useCallback } from 'react';
import { storyApi } from '../api';
import { StoryGroup } from '../types';
import { wsClient } from '../../../api/ws-client';

export function useStories(currentUserId?: string) {
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

  useEffect(() => {
    if (!currentUserId) return;

    wsClient.connect();
    const channel = wsClient.subscribe(`user-${currentUserId}`);

    channel.bind('story-viewed', (data: { storyId: string, viewedBy: string, viewedAt?: string, user?: { username: string, avatar?: string } }) => {
      setStoryGroups(prev => prev.map(storyGroup => ({
        ...storyGroup,
        stories: storyGroup.stories.map(s => {
          if (s._id === data.storyId) {
            const viewedBy = s.viewedBy || [];
            const exists = viewedBy.some(v => v.userId === data.viewedBy);
            
            const newViewerEntry = { 
              userId: data.viewedBy, 
              viewedAt: data.viewedAt || new Date().toISOString(),
              user: data.user 
            };
 
            if (exists) {
              return {
                ...s,
                viewedBy: viewedBy.map(v => 
                  v.userId === data.viewedBy ? { ...v, ...newViewerEntry, user: data.user || v.user } : v
                )
              };
            }
            return {
              ...s,
              viewedBy: [...viewedBy, newViewerEntry]
            };
          }
          return s;
        })
      })));
    });

    channel.bind('story-new', () => {
      fetchStories();
    });

    channel.bind('story-deleted', (data: { storyId: string, userId: string }) => {
      setStoryGroups(prev => prev.map(storyGroup => {
        if (storyGroup.user._id === data.userId) {
          return {
            ...storyGroup,
            stories: storyGroup.stories.filter(s => s._id !== data.storyId)
          };
        }
        return storyGroup;
      }).filter(storyGroup => storyGroup.stories.length > 0));
    });

    return () => {
      channel.unbind('story-viewed');
      channel.unbind('story-new');
      channel.unbind('story-deleted');
    };
  }, [currentUserId, fetchStories]);

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