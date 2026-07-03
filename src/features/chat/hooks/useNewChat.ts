import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { chatApi } from '../api';
import { SearchUser, ListItem } from '../types';

interface UseNewChatProps {
  isVisible: boolean;
  onClose: () => void;
  onChatCreated: (chatId: string) => void;
}

export function useNewChat({ isVisible, onClose, onChatCreated }: UseNewChatProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [suggestedContacts, setSuggestedContacts] = useState<SearchUser[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<SearchUser[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [allSearchedUsers, setAllSearchedUsers] = useState<SearchUser[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoadingInitial(true);

      const [contactsRes, recommendedRes] = await Promise.allSettled([
        chatApi.getSuggestedContacts(),
        chatApi.getRecommendedUsers(),
      ]);

      let contacts: SearchUser[] = [];
      if (contactsRes.status === 'fulfilled') {
        contacts = contactsRes.value.contacts || [];
        setSuggestedContacts(contacts);
      }

      if (recommendedRes.status === 'fulfilled') {
        const recUsers = recommendedRes.value.users || [];
        const filtered = recUsers.filter(
          (u: SearchUser) => !contacts.some(rc => rc._id === u._id)
        );
        setRecommendedUsers(filtered.slice(0, 30));
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  const resetModal = useCallback(() => {
    setSearchQuery('');
    setSuggestedContacts([]);
    setRecommendedUsers([]);
    setAllSearchedUsers([]);
    setPage(1);
    setHasMore(false);
  }, []);

  useEffect(() => {
    if (isVisible) {
      fetchInitialData();
    } else {
      resetModal();
    }
  }, [isVisible, fetchInitialData, resetModal]);

  const searchUsers = useCallback(async (query: string, pageNum: number) => {
    try {
      setLoading(true);
      const data = await chatApi.searchUsers(query, pageNum, 30);

      if (pageNum === 1) {
        setAllSearchedUsers(data.users || []);
      } else {
        setAllSearchedUsers(prev => [...prev, ...(data.users || [])]);
      }

      setPage(pageNum);
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setAllSearchedUsers([]);
      setPage(1);
      setHasMore(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setLoading(true);
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(searchQuery, 1);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchUsers]);

  const startChat = useCallback(async (recipientId: string) => {
    try {
      setCreating(true);
      const chat = await chatApi.createChat(recipientId);
      onClose();
      onChatCreated(chat._id);
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setCreating(false);
    }
  }, [onClose, onChatCreated]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading && searchQuery.trim().length >= 1) {
      searchUsers(searchQuery, page + 1);
    }
  }, [hasMore, loading, searchQuery, page, searchUsers]);

  const listItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];

    if (searchQuery.trim().length >= 1) {
      allSearchedUsers.forEach(u => {
        items.push({ type: 'user', id: u._id, user: u });
      });
    } else {
      if (suggestedContacts.length > 0) {
        items.push({ type: 'header', id: 'h-suggested', label: 'Suggested Contacts' });
        suggestedContacts.forEach(u => {
          items.push({ type: 'user', id: `s-${u._id}`, user: u });
        });
      }

      if (recommendedUsers.length > 0) {
        items.push({ type: 'header', id: 'h-recommended', label: 'Explore / Discover' });
        recommendedUsers.forEach(u => {
          items.push({ type: 'user', id: `r-${u._id}`, user: u });
        });
      }
    }

    return items;
  }, [searchQuery, allSearchedUsers, suggestedContacts, recommendedUsers]);

  return {
    searchQuery,
    setSearchQuery,
    loading,
    creating,
    loadingInitial,
    listItems,
    hasMore,
    startChat,
    loadMore,
  };
}
