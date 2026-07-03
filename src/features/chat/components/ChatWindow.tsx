import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ListRenderItemInfo,
  NativeSyntheticEvent,
  NativeScrollEvent,
  BackHandler,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../auth/context/AuthContext';
import { useChatDetails } from '../hooks/useChatDetails';
import { useChatMessages } from '../hooks/useChatMessages';
import { MessageBubble } from './MessageBubble';
import { Message } from '../types';
import { getAvatarColor, formatDateSeparator, isSameDay } from '../utils/format';

interface ChatWindowProps {
  chatId: string;
  currentUserId: string;
}

type ListItem =
  | { type: 'date'; id: string; label: string }
  | { type: 'message'; id: string; message: Message };

function buildListItems(messages: Message[]): ListItem[] {
  const items: ListItem[] = [];
  messages.forEach((message, index) => {
    const prev = index > 0 ? messages[index - 1] : null;
    if (!prev || !isSameDay(prev.createdAt, message.createdAt)) {
      items.push({
        type: 'date',
        id: `date-${message.createdAt}`,
        label: formatDateSeparator(message.createdAt),
      });
    }
    items.push({ type: 'message', id: message._id, message });
  });
  return items;
}

export const ChatWindow = ({ chatId, currentUserId }: ChatWindowProps) => {
  const router = useRouter();
  const { user } = useAuthContext();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList<ListItem>>(null);
  const shouldScrollRef = useRef(true);

  const { displayName, isGroup, loading: chatLoading, error: chatError } = useChatDetails(chatId, currentUserId);
  const {
    messages,
    loading: messagesLoading,
    loadingMore,
    hasMore,
    error: messagesError,
    loadMore,
    sendMessage,
    retryMessage,
  } = useChatMessages({ chatId, currentUserId });

  const listItems = buildListItems(messages);
  const avatarColor = getAvatarColor(chatId);
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const isLoading = chatLoading || messagesLoading;
  const error = chatError || messagesError;

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/tabs');
    }
  }, [router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  const scrollToBottom = useCallback((animated = true) => {
    if (listItems.length === 0) return;
    flatListRef.current?.scrollToEnd({ animated });
  }, [listItems.length]);

  useEffect(() => {
    if (!messagesLoading && messages.length > 0 && shouldScrollRef.current) {
      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [messagesLoading, messages.length, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.sender?._id === currentUserId || last.status === 'sending') {
        scrollToBottom(true);
      }
    }
  }, [messages, currentUserId, scrollToBottom]);

  const handleSend = useCallback(async () => {
    if (!user || !inputText.trim()) return;
    const text = inputText;
    setInputText('');
    shouldScrollRef.current = true;
    await sendMessage(text, {
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    });
  }, [user, inputText, sendMessage]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    shouldScrollRef.current = distanceFromBottom < 80;

    if (contentOffset.y < 40 && hasMore && !loadingMore) {
      loadMore();
    }
  }, [hasMore, loadingMore, loadMore]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<ListItem>) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateText}>{item.label}</Text>
        </View>
      );
    }

    const isOwn = item.message.sender?._id === currentUserId;
    return (
      <MessageBubble
        message={item.message}
        isOwn={isOwn}
        showSenderName={isGroup}
        onRetry={() => retryMessage(item.message)}
      />
    );
  }, [currentUserId, isGroup, retryMessage]);

  if (!user) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Feather name="arrow-left" size={24} color="#f4f4f5" />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.headerAvatarText}>{avatarLetter}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
          {isGroup && <Text style={styles.headerSubtitle}>Group chat</Text>}
        </View>
        <View style={styles.headerButton} />
      </View>

      {/* Messages */}
      <View style={styles.messagesContainer}>
        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        )}

        {error && !isLoading && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!isLoading && messages.length === 0 && !error && (
          <View style={styles.emptyContainer}>
            <Feather name="message-circle" size={40} color="#3f3f46" />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>Send a message to start the conversation</Text>
          </View>
        )}

        {messages.length > 0 && (
          <FlatList
            ref={flatListRef}
            data={listItems}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.messagesList}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              loadingMore ? (
                <View style={styles.loadMore}>
                  <ActivityIndicator size="small" color="#2563eb" />
                </View>
              ) : null
            }
          />
        )}
      </View>

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor="#52525b"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={4000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
          activeOpacity={0.7}
        >
          <Feather name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f4f4f5',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#71717a',
    marginTop: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    margin: 16,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#e4e4e7',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#71717a',
    fontSize: 14,
    textAlign: 'center',
  },
  dateSeparator: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dateText: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#18181b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  loadMore: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
    backgroundColor: '#09090b',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#18181b',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#f4f4f5',
    fontSize: 16,
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#1e3a5f',
    opacity: 0.6,
  },
});
