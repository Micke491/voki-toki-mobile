import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { chatApi } from '../api';
import { SearchUser } from '../types';
import { getAvatarColor } from '../utils/format';

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  existingParticipantIds: string[];
  currentUserId: string;
  onAdded?: () => void;
}

type Tab = 'chats' | 'global';

export const AddParticipantModal = ({
  isOpen,
  onClose,
  chatId,
  existingParticipantIds,
  currentUserId,
  onAdded,
}: AddParticipantModalProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);
  const [chatListUsers, setChatListUsers] = useState<SearchUser[]>([]);
  const [globalUsers, setGlobalUsers] = useState<SearchUser[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [adding, setAdding] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('chats');
      setSearchQuery('');
      setSelectedUsers([]);
      setGlobalUsers([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'chats') return;
    let cancelled = false;
    const fetchChatUsers = async () => {
      try {
        setLoadingChats(true);
        const chats = await chatApi.getChats();
        if (cancelled) return;
        const usersMap = new Map<string, SearchUser>();
        chats.forEach(chat => {
          if (!chat.isGroupChat && chat.participants) {
            chat.participants.forEach(p => {
              if (p._id !== currentUserId) {
                usersMap.set(p._id, { _id: p._id, username: p.username, avatar: p.avatar });
              }
            });
          }
        });
        setChatListUsers(Array.from(usersMap.values()));
      } catch (err) {
        console.error('Failed to load contacts', err);
      } finally {
        if (!cancelled) setLoadingChats(false);
      }
    };
    fetchChatUsers();
    return () => { cancelled = true; };
  }, [isOpen, activeTab, currentUserId]);

  useEffect(() => {
    if (activeTab !== 'global') return;
    if (searchQuery.trim().length < 2) {
      setGlobalUsers([]);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setLoadingGlobal(true);
        const { users } = await chatApi.searchUsers(searchQuery.trim());
        setGlobalUsers(users || []);
      } catch (err) {
        console.error('User search failed', err);
      } finally {
        setLoadingGlobal(false);
      }
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, activeTab]);

  const isExcluded = useCallback(
    (id: string) => existingParticipantIds.includes(id) || selectedUsers.some(u => u._id === id),
    [existingParticipantIds, selectedUsers]
  );

  // Only mount the native Modal window while actually open — nesting a
  // permanently-mounted Modal inside ChatSidebar's own Modal crashes on Android.
  if (!isOpen) return null;

  const filteredChatUsers = chatListUsers.filter(u => {
    if (isExcluded(u._id)) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return u.username.toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q);
  });

  const filteredGlobalUsers = globalUsers.filter(u => !isExcluded(u._id));

  const toggleUser = (user: SearchUser) => {
    setSelectedUsers(prev =>
      prev.some(u => u._id === user._id)
        ? prev.filter(u => u._id !== user._id)
        : [...prev, user]
    );
    setSearchQuery('');
    setGlobalUsers([]);
  };

  const removeSelected = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u._id !== userId));
  };

  const handleAdd = async () => {
    if (selectedUsers.length === 0) return;
    try {
      setAdding(true);
      await chatApi.addParticipants(chatId, selectedUsers.map(u => u._id));
      onAdded?.();
      onClose();
    } catch (err) {
      console.error('Failed to add participants', err);
    } finally {
      setAdding(false);
    }
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setGlobalUsers([]);
  };

  const renderUserRow = ({ item }: { item: SearchUser }) => (
    <TouchableOpacity style={styles.userRow} onPress={() => toggleUser(item)} activeOpacity={0.7}>
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.userAvatar} />
      ) : (
        <View style={[styles.userAvatar, { backgroundColor: getAvatarColor(item._id) }]}>
          <Text style={styles.userAvatarText}>{item.username.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        {item.name ? <Text style={styles.userSubtitle}>{item.name}</Text> : null}
      </View>
      <Feather name="plus-circle" size={22} color="#2563eb" />
    </TouchableOpacity>
  );

  const loading = activeTab === 'chats' ? loadingChats : loadingGlobal;
  const data = activeTab === 'chats' ? filteredChatUsers : filteredGlobalUsers;

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Participants</Text>
            <TouchableOpacity
              onPress={handleAdd}
              disabled={selectedUsers.length === 0 || adding}
              style={styles.headerButton}
            >
              {adding ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <Text style={[styles.addText, selectedUsers.length === 0 && styles.addTextDisabled]}>
                  Add{selectedUsers.length > 0 ? ` (${selectedUsers.length})` : ''}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'chats' && styles.tabActive]}
              onPress={() => switchTab('chats')}
            >
              <Text style={[styles.tabText, activeTab === 'chats' && styles.tabTextActive]}>From Chats</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'global' && styles.tabActive]}
              onPress={() => switchTab('global')}
            >
              <Text style={[styles.tabText, activeTab === 'global' && styles.tabTextActive]}>Global Search</Text>
            </TouchableOpacity>
          </View>

          {/* Selected chips */}
          {selectedUsers.length > 0 && (
            <View style={styles.chipsWrap}>
              {selectedUsers.map(user => (
                <View key={user._id} style={styles.chip}>
                  <Text style={styles.chipText}>{user.username}</Text>
                  <TouchableOpacity onPress={() => removeSelected(user._id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Feather name="x" size={14} color="#93c5fd" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Search */}
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#71717a" />
            <TextInput
              style={styles.searchInput}
              placeholder={activeTab === 'chats' ? 'Search contacts...' : 'Search users...'}
              placeholderTextColor="#71717a"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
          </View>

          {/* List */}
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#2563eb" />
              <Text style={styles.centeredText}>{activeTab === 'chats' ? 'Loading contacts...' : 'Searching...'}</Text>
            </View>
          ) : (
            <FlatList
              data={data}
              keyExtractor={item => item._id}
              renderItem={renderUserRow}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Feather name="users" size={32} color="#3f3f46" />
                  <Text style={styles.centeredText}>
                    {activeTab === 'global' && searchQuery.trim().length < 2
                      ? 'Type to search for users'
                      : 'No users found to add'}
                  </Text>
                </View>
              }
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  headerTitle: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButton: {
    minWidth: 64,
  },
  cancelText: {
    color: '#a1a1aa',
    fontSize: 16,
  },
  addText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  addTextDisabled: {
    color: '#3f3f46',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(37,99,235,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.3)',
  },
  chipText: {
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#f4f4f5',
    marginLeft: 8,
    fontSize: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#f4f4f5',
    fontSize: 15,
    fontWeight: '500',
  },
  userSubtitle: {
    color: '#71717a',
    fontSize: 13,
    marginTop: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  centeredText: {
    color: '#71717a',
    fontSize: 14,
  },
});
