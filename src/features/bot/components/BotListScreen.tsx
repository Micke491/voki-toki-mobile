import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator,
  Alert, RefreshControl, TextInput, Modal, TouchableWithoutFeedback, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { botApi } from '../api';
import { BotChat } from '../types';

interface ChatSection {
  title: string;
  data: BotChat[];
}

function groupChatsByDate(chats: BotChat[]): ChatSection[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const pinned: BotChat[] = [];
  const rest: BotChat[] = [];
  for (const chat of chats) {
    if (chat.pinned) pinned.push(chat);
    else rest.push(chat);
  }

  const sections: ChatSection[] = [];
  if (pinned.length > 0) sections.push({ title: 'Pinned', data: pinned });

  const buckets: ChatSection[] = [
    { title: 'Today', data: [] },
    { title: 'Yesterday', data: [] },
    { title: 'Previous 7 Days', data: [] },
    { title: 'Older', data: [] },
  ];
  for (const chat of rest) {
    const d = new Date(chat.updatedAt);
    if (d >= today) buckets[0].data.push(chat);
    else if (d >= yesterday) buckets[1].data.push(chat);
    else if (d >= weekAgo) buckets[2].data.push(chat);
    else buckets[3].data.push(chat);
  }
  return [...sections, ...buckets.filter(b => b.data.length > 0)];
}

function lastMessagePreview(chat: BotChat): string {
  const last = chat.messages?.[chat.messages.length - 1];
  if (!last) return 'Start a conversation';
  const prefix = last.role === 'user' ? 'You: ' : '';
  return prefix + (last.text || 'Attachment');
}

export function BotListScreen() {
  const router = useRouter();
  const hasLoadedRef = React.useRef(false);
  const [chats, setChats] = useState<BotChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuChat, setMenuChat] = useState<BotChat | null>(null);
  const [renameChat, setRenameChat] = useState<BotChat | null>(null);
  const [renameText, setRenameText] = useState('');
  const [renaming, setRenaming] = useState(false);

  const fetchChats = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await botApi.getChats();
      setChats(res.chats || []);
      hasLoadedRef.current = true;
    } catch {
      if (!silent) Alert.alert('Error', 'Failed to load AI chats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // First load shows the spinner; later focuses refresh silently.
      fetchChats(hasLoadedRef.current);
    }, [fetchChats])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchChats(true);
  };

  const filteredSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const visible = query
      ? chats.filter(c =>
          c.title.toLowerCase().includes(query) ||
          c.messages?.some(m => m.text?.toLowerCase().includes(query))
        )
      : chats;
    return groupChatsByDate(visible);
  }, [chats, searchQuery]);

  const handleDelete = (chat: BotChat) => {
    Alert.alert('Delete Chat', `Delete "${chat.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await botApi.deleteChat(chat._id);
            setChats(prev => prev.filter(c => c._id !== chat._id));
          } catch {
            Alert.alert('Error', 'Failed to delete chat');
          }
        },
      },
    ]);
  };

  const handleTogglePin = async (chat: BotChat) => {
    try {
      const res = await botApi.pinChat(chat._id, !chat.pinned);
      setChats(prev => prev.map(c => (c._id === chat._id ? { ...c, pinned: res.pinned } : c)));
    } catch {
      Alert.alert('Error', 'Failed to update pin');
    }
  };

  const openRename = (chat: BotChat) => {
    setRenameText(chat.title);
    setRenameChat(chat);
  };

  const submitRename = async () => {
    if (!renameChat) return;
    const title = renameText.trim();
    if (!title || title === renameChat.title) {
      setRenameChat(null);
      return;
    }
    try {
      setRenaming(true);
      const res = await botApi.renameChat(renameChat._id, title);
      setChats(prev => prev.map(c => (c._id === renameChat._id ? { ...c, title: res.title || title } : c)));
      setRenameChat(null);
    } catch {
      Alert.alert('Error', 'Failed to rename chat');
    } finally {
      setRenaming(false);
    }
  };

  const renderItem = ({ item }: { item: BotChat }) => (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() => router.push(`/bot/${item._id}`)}
      onLongPress={() => setMenuChat(item)}
      activeOpacity={0.75}
    >
      <LinearGradient
        colors={['#2563eb', '#9333ea']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatar}
      >
        <Feather name="cpu" size={19} color="#fff" />
      </LinearGradient>
      <View style={styles.chatInfo}>
        <View style={styles.chatTitleRow}>
          {item.pinned && <Feather name="bookmark" size={12} color="#818cf8" />}
          <Text style={styles.chatTitle} numberOfLines={1}>{item.title || 'New Chat'}</Text>
          <Text style={styles.chatDate}>
            {new Date(item.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <Text style={styles.chatPreview} numberOfLines={1}>{lastMessagePreview(item)}</Text>
      </View>
      <TouchableOpacity
        style={styles.moreButton}
        onPress={() => setMenuChat(item)}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        <Feather name="more-vertical" size={18} color="#71717a" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleWrap}>
            <LinearGradient
              colors={['#2563eb', '#9333ea']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIcon}
            >
              <Feather name="cpu" size={17} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={styles.headerTitle}>AI Assistant</Text>
              <Text style={styles.headerSubtitle}>Your conversations</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={() => router.push('/bot/new')}
            accessibilityLabel="Start a new chat"
          >
            <Feather name="plus" size={18} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Feather name="search" size={15} color="#71717a" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations…"
            placeholderTextColor="#71717a"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={15} color="#71717a" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <SectionList
          sections={filteredSections}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Feather name={searchQuery ? 'search' : 'message-square'} size={34} color="#3f3f46" />
              </View>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No matching chats' : 'No chats yet'}
              </Text>
              <Text style={styles.emptySubText}>
                {searchQuery
                  ? 'Try a different search'
                  : 'Tap + to start chatting with your AI assistant'}
              </Text>
            </View>
          }
        />
      )}

      {/* Chat actions menu */}
      {menuChat && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setMenuChat(null)}>
          <TouchableWithoutFeedback onPress={() => setMenuChat(null)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.menuContainer}>
                  <Text style={styles.menuTitle} numberOfLines={1}>{menuChat.title}</Text>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { const c = menuChat; setMenuChat(null); handleTogglePin(c); }}
                  >
                    <Feather name="bookmark" size={19} color="#818cf8" />
                    <Text style={styles.menuItemText}>{menuChat.pinned ? 'Unpin Chat' : 'Pin Chat'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { const c = menuChat; setMenuChat(null); openRename(c); }}
                  >
                    <Feather name="edit-2" size={19} color="#f4f4f5" />
                    <Text style={styles.menuItemText}>Rename Chat</Text>
                  </TouchableOpacity>
                  <View style={styles.menuDivider} />
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { const c = menuChat; setMenuChat(null); handleDelete(c); }}
                  >
                    <Feather name="trash-2" size={19} color="#ef4444" />
                    <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Delete Chat</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Rename modal */}
      {renameChat && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setRenameChat(null)}>
          <TouchableWithoutFeedback onPress={() => !renaming && setRenameChat(null)}>
            <View style={styles.renameOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.renameCard}>
                  <Text style={styles.renameTitle}>Rename Chat</Text>
                  <TextInput
                    style={styles.renameInput}
                    value={renameText}
                    onChangeText={setRenameText}
                    placeholder="Chat title"
                    placeholderTextColor="#71717a"
                    maxLength={60}
                    autoFocus
                    editable={!renaming}
                  />
                  <View style={styles.renameActions}>
                    <TouchableOpacity
                      style={styles.renameCancel}
                      onPress={() => setRenameChat(null)}
                      disabled={renaming}
                    >
                      <Text style={styles.renameCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.renameSave, (!renameText.trim() || renaming) && { opacity: 0.5 }]}
                      onPress={submitRename}
                      disabled={!renameText.trim() || renaming}
                    >
                      {renaming ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.renameSaveText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 58 : 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    backgroundColor: '#18181b',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#f4f4f5' },
  headerSubtitle: { fontSize: 11, color: '#71717a', fontWeight: '600' },
  newChatButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(37,99,235,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 13,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: '#f4f4f5',
    fontSize: 13,
    paddingVertical: 9,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 90 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#71717a',
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 13,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatInfo: { flex: 1 },
  chatTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  chatTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#f4f4f5' },
  chatDate: { fontSize: 11, color: '#71717a', fontWeight: '600' },
  chatPreview: { fontSize: 12.5, color: '#a1a1aa' },
  moreButton: { padding: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 90 },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: { fontSize: 18, fontWeight: '800', color: '#f4f4f5', marginBottom: 6 },
  emptySubText: { fontSize: 13, color: '#a1a1aa', textAlign: 'center', paddingHorizontal: 40 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 38,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f4f4f5',
    marginBottom: 12,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  menuItemText: { fontSize: 15, color: '#f4f4f5', fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#27272a', marginVertical: 6 },
  renameOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  renameCard: {
    width: '100%',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 20,
    padding: 20,
  },
  renameTitle: { fontSize: 17, fontWeight: '800', color: '#f4f4f5', marginBottom: 14 },
  renameInput: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#f4f4f5',
    fontSize: 14,
    marginBottom: 16,
  },
  renameActions: { flexDirection: 'row', gap: 10 },
  renameCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 13,
    alignItems: 'center',
    backgroundColor: '#27272a',
  },
  renameCancelText: { fontSize: 14, fontWeight: '700', color: '#a1a1aa' },
  renameSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 13,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  renameSaveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
