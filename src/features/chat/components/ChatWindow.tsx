import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
  Animated,
  Image,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../auth/context/AuthContext';
import { resolveWallpaperColors } from '../utils/wallpaperPresets';
import { useChatDetails } from '../hooks/useChatDetails';
import { useChatMessages } from '../hooks/useChatMessages';
import { MessageBubble } from './MessageBubble';
import { Message } from '../types';
import { getAvatarColor, formatDateSeparator, isSameDay } from '../utils/format';
import { AttachmentSheet } from './AttachmentSheet';
import { useMediaPicker } from '../hooks/useMediaPicker';
import { GiphyPicker } from './GiphyPicker';
import { Audio } from 'expo-av';
import { chatApi } from '../api';
import { ForwardMessageModal } from '../../../components/ForwardMessageModal';
import { useChatList } from '../hooks/useChatList';
import { ChatSidebar } from './ChatSidebar';
import { ReadReceiptModal } from './ReadReceiptModal';
import { useCallContext } from '../../calls/CallContext';
import { MediaViewer } from '../../../components/MediaViewer';
import { ReportModal } from '../../../components/ReportModal';
import EmojiPicker from 'rn-emoji-keyboard';
import { BlockStatus } from '../types';
import { getDraft, setDraft } from '../utils/draftStore';
import { useStories } from '../../story/hooks/useStories';
import { StoryRing } from '../../story/components/StoryRing';
import { StoryViewer } from '../../story/components/StoryViewer';

const emojiPickerTheme = {
  backdrop: 'rgba(0,0,0,0.6)',
  knob: '#3f3f46',
  container: '#18181b',
  header: '#a1a1aa',
  skinTonesContainer: '#27272a',
  category: {
    icon: '#71717a',
    iconActive: '#2563eb',
    container: '#18181b',
    containerActive: '#27272a',
  },
  search: {
    background: '#27272a',
    text: '#f4f4f5',
    placeholder: '#71717a',
    icon: '#71717a',
  },
  customButton: {
    icon: '#71717a',
    iconPressed: '#f4f4f5',
    background: '#18181b',
    backgroundPressed: '#27272a',
  },
  emoji: {
    selected: 'rgba(37,99,235,0.2)',
  },
};

interface ChatWindowProps {
  chatId: string;
  currentUserId: string;
}

type ListItem =
  | { type: 'date'; id: string; label: string }
  | { type: 'message'; id: string; message: Message }
  | { type: 'unread-separator'; id: string };

function buildListItems(messages: Message[], firstUnreadId: string | null): ListItem[] {
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

    if (firstUnreadId && message._id === firstUnreadId) {
      items.push({
        type: 'unread-separator',
        id: 'unread-separator',
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
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState<Message | null>(null);
  const [emojiPickerMessage, setEmojiPickerMessage] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [reactionsDetailMessage, setReactionsDetailMessage] = useState<Message | null>(null);
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [viewingReceiptsFor, setViewingReceiptsFor] = useState<Message | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
  const draftLoadedRef = useRef(false);
  
  const [showGiphyPicker, setShowGiphyPicker] = useState(false);
  const [giphyType, setGiphyType] = useState<'gifs' | 'stickers'>('gifs');

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const waveformAnims = useRef(
    Array.from({ length: 24 }, () => new Animated.Value(0.3))
  ).current;

  const badgeScaleAnim = useRef(new Animated.Value(0)).current;

  const { chat, displayName, isGroup, loading: chatLoading, error: chatError, removed, setChat } = useChatDetails(chatId, currentUserId);
  const {
    messages,
    loading: messagesLoading,
    loadingMore,
    hasMore,
    error: messagesError,
    loadMore,
    sendMessage,
    retryMessage,
    sendMediaMessage,
    forwardMessage,
    toggleReaction,
    unreadCountBelow,
    showNewMessageBadge,
    firstUnreadId,
    updateScrollPosition,
    resetUnreadBelow,
    pinnedMessages,
    typingUsers,
  } = useChatMessages({ chatId, currentUserId });

  const { chats } = useChatList(currentUserId, chatId);
  const { startCall } = useCallContext();

  const listItems = useMemo(
    () => buildListItems(messages, firstUnreadId).reverse(),
    [messages, firstUnreadId]
  );
  const hasScrolledInitiallyRef = useRef(false);
  const avatarColor = getAvatarColor(chatId);
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const otherParticipant = useMemo(
    () => chat?.participants.find(p => p._id !== currentUserId),
    [chat, currentUserId]
  );
  const chatAvatarUrl = isGroup ? chat?.avatar : otherParticipant?.avatar;
  const isLoading = chatLoading || messagesLoading;
  const error = chatError || messagesError;

  // Stories: powers the ring around the header avatar and story-reply cards.
  const { storyGroups, markViewed: markStoryViewed, deleteStory, hasUnviewedStories } = useStories(currentUserId);
  const [viewingStory, setViewingStory] = useState<{ groupIndex: number; storyIndex: number } | null>(null);

  const recipientGroupIndex = useMemo(
    () => (isGroup || !otherParticipant ? -1 : storyGroups.findIndex(g => g.user._id === otherParticipant._id)),
    [storyGroups, isGroup, otherParticipant]
  );
  const recipientGroup = recipientGroupIndex >= 0 ? storyGroups[recipientGroupIndex] : undefined;

  const handleViewStory = useCallback((storyId: string) => {
    for (let g = 0; g < storyGroups.length; g++) {
      const idx = storyGroups[g].stories.findIndex(s => s._id === storyId);
      if (idx >= 0) {
        setViewingStory({ groupIndex: g, storyIndex: idx });
        return;
      }
    }
    Alert.alert('Story unavailable', 'This story could not be found or has expired.');
  }, [storyGroups]);

  // A deleted account surfaces as a 1:1 chat whose remaining participant has no
  // usable username (the backend strips it), mirroring the web app.
  const isRecipientDeleted = useMemo(() => {
    if (isGroup || !chat) return false;
    const name = otherParticipant?.username;
    return !name || name === 'Unknown' || name === 'Unknown User';
  }, [isGroup, chat, otherParticipant]);

  const isBlockedChat = !!blockStatus?.blocked;
  // Blocks (either direction) and deleted accounts both make the conversation
  // read-only: no sending, calling, reacting or replying.
  const interactionDisabled = isBlockedChat || isRecipientDeleted;
  const disabledReason: 'blocked' | 'deleted' | null = isBlockedChat
    ? 'blocked'
    : isRecipientDeleted
    ? 'deleted'
    : null;

  const handleCallAction = useCallback((type: 'voice' | 'video') => {
    if (interactionDisabled) return;
    startCall({
      chatId,
      calleeId: isGroup ? '' : (otherParticipant?._id || ''),
      calleeName: displayName,
      calleeAvatar: isGroup ? chat?.avatar : otherParticipant?.avatar,
      type,
    });
  }, [startCall, chatId, isGroup, otherParticipant, displayName, chat, interactionDisabled]);

  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const { pickFromLibrary, pickFromCamera } = useMediaPicker();

  useEffect(() => {
    Animated.spring(badgeScaleAnim, {
      toValue: showNewMessageBadge && unreadCountBelow > 0 ? 1 : 0,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [showNewMessageBadge, unreadCountBelow, badgeScaleAnim]);

  const handlePickAndSend = useCallback(async (source: 'library' | 'photo' | 'video') => {
    if (!user) return;
    const media = source === 'library'
      ? await pickFromLibrary()
      : await pickFromCamera(source === 'video' ? 'video' : 'photo');
    if (!media) return;

    shouldScrollRef.current = true;
    await sendMediaMessage(
      { uri: media.uri, fileName: media.fileName, mimeType: media.mimeType, type: media.type },
      { _id: user._id, username: user.username, email: user.email, avatar: user.avatar }
    );
  }, [user, pickFromLibrary, pickFromCamera, sendMediaMessage]);

  const handlePickGiphy = useCallback(async (url: string) => {
    if (!user) return;
    shouldScrollRef.current = true;
    await sendMediaMessage(
      { uri: url, fileName: `giphy_${Date.now()}.gif`, mimeType: 'image/gif', type: giphyType === 'stickers' ? 'sticker' : 'gif' },
      { _id: user._id, username: user.username, email: user.email, avatar: user.avatar }
    );
  }, [user, sendMediaMessage, giphyType]);

  // Start waveform animation loop
  const startWaveformAnimation = useCallback(() => {
    const animate = () => {
      const animations = waveformAnims.map((anim) => {
        const target = 0.3 + Math.random() * 0.7;
        return Animated.timing(anim, {
          toValue: target,
          duration: 120 + Math.random() * 180,
          useNativeDriver: true,
        });
      });
      Animated.parallel(animations).start(() => {
        if (recordingTimerRef.current) animate();
      });
    };
    animate();
  }, [waveformAnims]);

  const handleStartRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const customOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          extension: '.mp3',
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          extension: '.mp3',
        },
      };
      const { recording } = await Audio.Recording.createAsync(customOptions);
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      startWaveformAnimation();
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const handleStopAndSend = async () => {
    if (!recording || !user) return;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);
      setRecording(null);
      setRecordingDuration(0);
      
      if (uri) {
        shouldScrollRef.current = true;
        await sendMediaMessage(
          { uri, fileName: `audio_${Date.now()}.mp3`, mimeType: 'audio/mpeg', type: 'audio' },
          { _id: user._id, username: user.username, email: user.email, avatar: user.avatar }
        );
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const handleCancelRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (err) {
        // ignore
      }
    }
    setRecording(null);
    setIsRecording(false);
    setRecordingDuration(0);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

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

  useEffect(() => {
    hasScrolledInitiallyRef.current = false;
  }, [chatId]);

  // Restore any saved draft when the chat changes.
  useEffect(() => {
    let cancelled = false;
    draftLoadedRef.current = false;
    (async () => {
      const savedDraft = await getDraft(chatId);
      if (cancelled) return;
      // Reset to the saved draft (or empty) so drafts never leak between chats.
      setInputText(savedDraft);
      draftLoadedRef.current = true;
    })();
    return () => { cancelled = true; };
  }, [chatId]);

  // Persist the composing draft (skip while editing an existing message) and
  // broadcast it so the chat list can show "Draft: ..." without polling storage.
  useEffect(() => {
    if (!draftLoadedRef.current || editingMessage) return;
    const handle = setTimeout(() => {
      setDraft(chatId, inputText);
    }, 400);
    return () => clearTimeout(handle);
  }, [inputText, chatId, editingMessage]);

  // Fetch block status for 1:1 chats so we can lock the conversation down.
  useEffect(() => {
    if (isGroup || !chat) {
      setBlockStatus(null);
      return;
    }
    let cancelled = false;
    chatApi.checkBlockStatus(chatId)
      .then(status => { if (!cancelled) setBlockStatus(status); })
      .catch(() => { if (!cancelled) setBlockStatus(null); });
    return () => { cancelled = true; };
  }, [chatId, isGroup, chat]);

  // If the current user is removed from / leaves this group elsewhere, bail out.
  useEffect(() => {
    if (removed) {
      setShowSidebar(false);
      handleBack();
    }
  }, [removed, handleBack]);

  const scrollToBottom = useCallback((animated = true) => {
    if (listItems.length === 0) return;
    flatListRef.current?.scrollToOffset({ offset: 0, animated });
  }, [listItems.length]);

  useEffect(() => {
    if (messagesLoading || messages.length === 0 || hasScrolledInitiallyRef.current) return;

    const timer = setTimeout(() => {
      if (firstUnreadId) {
        const unreadIndex = listItems.findIndex(i => i.type === 'unread-separator');
        if (unreadIndex !== -1) {
          try {
            flatListRef.current?.scrollToIndex({
              index: Math.max(0, unreadIndex),
              animated: false,
              viewPosition: 0.1,
            });
          } catch {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
          }
        } else {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        }
      } else {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
      hasScrolledInitiallyRef.current = true;
    }, 150);

    return () => clearTimeout(timer);
  }, [messagesLoading, messages.length, firstUnreadId, listItems]);

  useEffect(() => {
    if (!hasScrolledInitiallyRef.current || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.sender?._id === currentUserId || last.status === 'sending') {
      setTimeout(() => scrollToBottom(true), 50);
    } else if (shouldScrollRef.current) {
      setTimeout(() => scrollToBottom(true), 50);
    }
  }, [messages.length, currentUserId, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current && user) {
        chatApi.sendTypingStatus(chatId, user.username, false).catch(() => {});
      }
    };
  }, [chatId, user]);

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (!user) return;

    if (text.trim().length > 0) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        chatApi.sendTypingStatus(chatId, user.username, true).catch(() => {});
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          chatApi.sendTypingStatus(chatId, user.username, false).catch(() => {});
          isTypingRef.current = false;
        }
      }, 2000);
    } else {
      if (isTypingRef.current) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        chatApi.sendTypingStatus(chatId, user.username, false).catch(() => {});
        isTypingRef.current = false;
      }
    }
  };

  const handleSend = useCallback(async () => {
    if (!user || !inputText.trim() || interactionDisabled) return;
    const text = inputText;
    setInputText('');
    setDraft(chatId, '');

    if (isTypingRef.current) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      chatApi.sendTypingStatus(chatId, user.username, false).catch(() => {});
      isTypingRef.current = false;
    }

    const replyToId = replyingTo?._id;
    const editId = editingMessage?._id;
    
    setReplyingTo(null);
    setEditingMessage(null);
    shouldScrollRef.current = true;
    
    if (editId) {
      try {
        await chatApi.editMessage(editId, text);
      } catch (err) {
        console.error(err);
      }
      return;
    }

    if (replyToId) {
      try {
        await chatApi.sendMessage({
          chatId,
          senderId: user._id,
          text,
          replyTo: replyToId
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      await sendMessage(text, {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      });
    }
  }, [user, inputText, sendMessage, replyingTo, editingMessage, chatId, interactionDisabled]);

  const handleScrollToNewMessages = useCallback(() => {
    scrollToBottom(true);
    resetUnreadBelow();
  }, [scrollToBottom, resetUnreadBelow]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    const nearBottom = contentOffset.y < 80;
    
    shouldScrollRef.current = nearBottom;
    updateScrollPosition(nearBottom);
  }, [updateScrollPosition]);

  const handleToggleReaction = useCallback((message: Message, emoji: string) => {
    if (!user || interactionDisabled) return;
    toggleReaction(message, emoji, { username: user.username, avatar: user.avatar });
  }, [user, toggleReaction, interactionDisabled]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<ListItem>) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateText}>{item.label}</Text>
        </View>
      );
    }

    if (item.type === 'unread-separator') {
      return (
        <View style={styles.unreadSeparator}>
          <View style={styles.unreadLine} />
          <Text style={styles.unreadSeparatorText}>New Messages</Text>
          <View style={styles.unreadLine} />
        </View>
      );
    }

    const isOwn = item.message.sender?._id === currentUserId;
    return (
      <MessageBubble
        message={item.message}
        isOwn={isOwn}
        showSenderName={isGroup}
        showAvatar={!isOwn}
        currentUserId={currentUserId}
        interactionDisabled={interactionDisabled}
        onRetry={() => retryMessage(item.message)}
        onLongPress={() => setSelectedMessageForMenu(item.message)}
        onSwipeReply={() => interactionDisabled ? undefined : setReplyingTo(item.message)}
        onPressMedia={(url, type) => setViewingMedia({ url, type })}
        onToggleReaction={(emoji) => handleToggleReaction(item.message, emoji)}
        onOpenReactions={() => setReactionsDetailMessage(item.message)}
        onCallAction={handleCallAction}
        recipientUsername={!isGroup ? otherParticipant?.username : undefined}
        onViewStory={handleViewStory}
      />
    );
  }, [currentUserId, isGroup, retryMessage, handleToggleReaction, handleCallAction, interactionDisabled, otherParticipant?.username, handleViewStory]);

  const handleUnpinTop = useCallback(async () => {
    if (pinnedMessages.length === 0) return;
    try {
      await chatApi.unpinMessage(chatId, pinnedMessages[0]._id);
    } catch (err) {
      console.error(err);
    }
  }, [chatId, pinnedMessages]);

  const handleJumpToPinned = useCallback(() => {
    if (pinnedMessages.length === 0) return;
    const pinnedId = pinnedMessages[0]._id;
    const index = listItems.findIndex(item => item.type === 'message' && item.message._id === pinnedId);
    if (index !== -1) {
      try {
        flatListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, [listItems, pinnedMessages]);

  const getPinnedMessagePreview = (msg: Message): string => {
    if (msg.isDeletedForEveryone) return 'Message deleted';
    if (msg.text) return msg.text;
    if (msg.mediaType) {
      const labels: Record<string, string> = {
        image: 'Photo',
        video: 'Video',
        audio: 'Voice message',
        gif: 'GIF',
        sticker: 'Sticker',
        call: 'Call',
      };
      return labels[msg.mediaType] || 'Attachment';
    }
    return 'Pinned Message';
  };

  if (!user) return null;

  const wallpaperColors = resolveWallpaperColors(user.defaultWallpaper);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {wallpaperColors && (
        <LinearGradient
          colors={wallpaperColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Feather name="arrow-left" size={24} color="#f4f4f5" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAvatarWrap} onPress={() => setShowSidebar(true)}>
          {!isGroup ? (
            <StoryRing
              avatarUrl={otherParticipant?.avatar}
              username={otherParticipant?.username || displayName}
              hasStory={!!recipientGroup}
              hasUnviewedStory={!!recipientGroup && hasUnviewedStories(recipientGroup)}
              size={40}
              onPress={
                recipientGroup
                  ? () => setViewingStory({ groupIndex: recipientGroupIndex, storyIndex: 0 })
                  : undefined
              }
            />
          ) : chatAvatarUrl ? (
            <Image source={{ uri: chatAvatarUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, { backgroundColor: avatarColor, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.headerAvatarText}>{avatarLetter}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} onPress={() => setShowSidebar(true)}>
          <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
          {isGroup && <Text style={styles.headerSubtitle}>Group chat</Text>}
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            disabled={interactionDisabled}
            onPress={() => handleCallAction('voice')}
          >
            <Feather name="phone" size={20} color={interactionDisabled ? '#3f3f46' : '#f4f4f5'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionBtn}
            disabled={interactionDisabled}
            onPress={() => handleCallAction('video')}
          >
            <Feather name="video" size={20} color={interactionDisabled ? '#3f3f46' : '#f4f4f5'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn} onPress={() => setShowSidebar(true)}>
            <Feather name="more-vertical" size={20} color="#f4f4f5" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Pinned Messages Banner */}
      {pinnedMessages.length > 0 && (
         <View style={styles.pinnedBanner}>
            <TouchableOpacity style={styles.pinnedBannerLeft} onPress={handleJumpToPinned} activeOpacity={0.8}>
               <Feather name="map-pin" size={14} color="#2563eb" style={styles.pinnedBannerIcon} />
               <View style={styles.pinnedBannerTextContainer}>
                  <Text style={styles.pinnedBannerHeaderTitle}>Pinned Message</Text>
                  <Text style={styles.pinnedBannerContent} numberOfLines={1}>
                     {pinnedMessages[0].sender?.username || 'Someone'}: {getPinnedMessagePreview(pinnedMessages[0])}
                  </Text>
               </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pinnedBannerUnpinButton} onPress={handleUnpinTop}>
               <Feather name="x" size={16} color="#71717a" />
            </TouchableOpacity>
         </View>
      )}

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
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            inverted={true}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            maxToRenderPerBatch={15}
            windowSize={11}
            removeClippedSubviews={Platform.OS === 'android'}
            initialNumToRender={20}
            maintainVisibleContentPosition={{
              minIndexForVisible: 1,
              autoscrollToTopThreshold: 10,
            }}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                try {
                  flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
                } catch (e) {}
              }, 300);
            }}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadMore}>
                  <View style={styles.loadMoreInner}>
                    <ActivityIndicator size="small" color="#60a5fa" />
                    <Text style={styles.loadMoreText}>Loading older messages...</Text>
                  </View>
                </View>
              ) : !hasMore ? (
                <View style={styles.introHeader}>
                  {chatAvatarUrl ? (
                    <Image source={{ uri: chatAvatarUrl }} style={styles.introAvatar} />
                  ) : (
                    <View style={[styles.introAvatar, { backgroundColor: avatarColor, justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={styles.introAvatarText}>{avatarLetter}</Text>
                    </View>
                  )}
                  <Text style={styles.introName}>{displayName}</Text>
                  <Text style={styles.introSubtitle}>
                    {isGroup ? `Group · ${chat?.participants.length || 0} participants` : displayName}
                  </Text>
                  <TouchableOpacity style={styles.introButton} onPress={() => setShowSidebar(true)} activeOpacity={0.8}>
                    <Text style={styles.introButtonText}>{isGroup ? 'View Group Info' : 'View Profile'}</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        )}

        {/* New Message Floating Badge */}
        <Animated.View
          style={[
            styles.newMessageBadge,
            {
              transform: [{ scale: badgeScaleAnim }],
              opacity: badgeScaleAnim,
            },
          ]}
          pointerEvents={showNewMessageBadge && unreadCountBelow > 0 ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={styles.newMessageBadgeButton}
            onPress={handleScrollToNewMessages}
            activeOpacity={0.8}
          >
            <Feather name="chevron-down" size={20} color="#fff" />
            {unreadCountBelow > 0 && (
              <View style={styles.newMessageCount}>
                <Text style={styles.newMessageCountText}>
                  {unreadCountBelow > 99 ? '99+' : unreadCountBelow}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Reply Preview */}
      {replyingTo && (
        <View style={styles.replyPreview}>
           <View style={{ flex: 1 }}>
             <Text style={styles.replyPreviewTitle}>Replying to {replyingTo.sender.username}</Text>
             <Text style={styles.replyPreviewText} numberOfLines={1}>{replyingTo.text || 'Media message'}</Text>
           </View>
           <TouchableOpacity onPress={() => setReplyingTo(null)}>
             <Feather name="x" size={20} color="#71717a" />
           </TouchableOpacity>
        </View>
      )}

      {/* Edit Preview */}
      {editingMessage && (
        <View style={styles.replyPreview}>
           <View style={{ flex: 1 }}>
             <Text style={styles.replyPreviewTitle}>Edit Message</Text>
             <Text style={styles.replyPreviewText} numberOfLines={1}>{editingMessage.text}</Text>
           </View>
           <TouchableOpacity onPress={() => {
             setEditingMessage(null);
             setInputText('');
           }}>
             <Feather name="x" size={20} color="#71717a" />
           </TouchableOpacity>
        </View>
      )}

      {/* Typing Indicator Bar */}
      {typingUsers && typingUsers.length > 0 && (
        <View style={styles.typingIndicatorContainer}>
          <Text style={styles.typingIndicatorText} numberOfLines={1}>
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing...`
              : `${typingUsers.join(', ')} are typing...`}
          </Text>
        </View>
      )}

      {/* Input (replaced by a read-only banner when blocked or the account is deleted) */}
      {interactionDisabled ? (
        <View style={styles.disabledBanner}>
          <Feather
            name={disabledReason === 'deleted' ? 'user-x' : 'slash'}
            size={16}
            color="#a1a1aa"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.disabledBannerText}>
            {disabledReason === 'deleted'
              ? 'This account has been deleted. You can no longer send messages or call.'
              : "You can't send messages to this conversation. A block exists between you and this user."}
          </Text>
        </View>
      ) : (
      <View style={styles.inputBar}>
        {isRecording ? (
          <View style={styles.recordingBar}>
            <Animated.View style={styles.recordingDot} />
            <Text style={styles.recordingTimer}>{formatRecordingTime(recordingDuration)}</Text>
            <View style={styles.waveformContainer}>
              {waveformAnims.map((anim, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.waveformBar,
                    { transform: [{ scaleY: anim }] },
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.recordingCancelBtn}
              onPress={handleCancelRecording}
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={20} color="#ef4444" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleStopAndSend}
              activeOpacity={0.7}
            >
              <Feather name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={() => setShowAttachSheet(true)}
              activeOpacity={0.7}
            >
              <Feather name="plus-circle" size={26} color="#71717a" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Message..."
              placeholderTextColor="#52525b"
              value={inputText}
              onChangeText={handleInputChange}
              multiline
              maxLength={2000}
            />
            
            {inputText.trim() ? (
              <TouchableOpacity
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!inputText.trim()}
                activeOpacity={0.7}
              >
                <Feather name="send" size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.micButton}
                onPress={handleStartRecording}
                activeOpacity={0.7}
              >
                <Feather name="mic" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
      )}

      <AttachmentSheet
        visible={showAttachSheet}
        onClose={() => setShowAttachSheet(false)}
        onPickLibrary={() => handlePickAndSend('library')}
        onTakePhoto={() => handlePickAndSend('photo')}
        onTakeVideo={() => handlePickAndSend('video')}
        onPickGif={() => { setShowAttachSheet(false); setTimeout(() => { setGiphyType('gifs'); setShowGiphyPicker(true); }, 300); }}
        onPickSticker={() => { setShowAttachSheet(false); setTimeout(() => { setGiphyType('stickers'); setShowGiphyPicker(true); }, 300); }}
      />
      
      <GiphyPicker
        visible={showGiphyPicker}
        onClose={() => setShowGiphyPicker(false)}
        onSelect={handlePickGiphy}
        type={giphyType}
      />
      
      {/* Message Context Menu */}
      {selectedMessageForMenu && (
        <MessageContextMenu
           message={selectedMessageForMenu}
           currentUserId={currentUserId}
           interactionDisabled={interactionDisabled}
           onClose={() => setSelectedMessageForMenu(null)}
           onMessageInfo={() => { setViewingReceiptsFor(selectedMessageForMenu); setSelectedMessageForMenu(null); }}
           onReply={() => { setReplyingTo(selectedMessageForMenu); setSelectedMessageForMenu(null); }}
           onEdit={() => {
             setEditingMessage(selectedMessageForMenu);
             setInputText(selectedMessageForMenu.text || '');
             setSelectedMessageForMenu(null);
           }}
           onReact={(emoji: string) => {
             const msg = selectedMessageForMenu;
             setSelectedMessageForMenu(null);
             handleToggleReaction(msg, emoji);
           }}
           onOpenFullPicker={() => {
             setEmojiPickerMessage(selectedMessageForMenu);
             setSelectedMessageForMenu(null);
           }}
           onPin={async () => {
             const isCurrentlyPinned = selectedMessageForMenu.isPinned;
             setSelectedMessageForMenu(null);
             try {
               if (isCurrentlyPinned) {
                 await chatApi.unpinMessage(chatId, selectedMessageForMenu._id);
               } else {
                 await chatApi.pinMessage(chatId, selectedMessageForMenu._id);
               }
             } catch (err) {
               console.error(err);
             }
           }}
           onDelete={async () => {
             setSelectedMessageForMenu(null);
             await chatApi.deleteMessage(selectedMessageForMenu._id, true);
           }}
           onForward={() => {
             setForwardingMessage(selectedMessageForMenu);
             setSelectedMessageForMenu(null);
           }}
           onReport={() => {
             setReportingMessage(selectedMessageForMenu);
             setSelectedMessageForMenu(null);
           }}
           isOwn={selectedMessageForMenu.sender?._id === currentUserId}
        />
      )}

      {/* Report Message Modal */}
      <ReportModal
        isOpen={!!reportingMessage}
        onClose={() => setReportingMessage(null)}
        targetId={reportingMessage?._id || ''}
        targetType="message"
      />

      {/* Story Viewer (header ring / story-reply cards) */}
      {viewingStory && storyGroups[viewingStory.groupIndex] && (
        <StoryViewer
          groups={storyGroups}
          initialGroupIndex={viewingStory.groupIndex}
          initialStoryIndex={viewingStory.storyIndex}
          currentUser={user ? { _id: user._id, username: user.username, avatar: user.avatar } : null}
          onClose={() => setViewingStory(null)}
          onViewed={markStoryViewed}
          onDeleteStory={deleteStory}
        />
      )}

      <EmojiPicker
        open={!!emojiPickerMessage}
        onClose={() => setEmojiPickerMessage(null)}
        onEmojiSelected={(emojiObject) => {
          if (emojiPickerMessage) handleToggleReaction(emojiPickerMessage, emojiObject.emoji);
        }}
        enableSearchBar
        categoryPosition="top"
        theme={emojiPickerTheme}
      />

      <ForwardMessageModal
        isOpen={!!forwardingMessage}
        onClose={() => setForwardingMessage(null)}
        chats={chats}
        currentUserId={currentUserId}
        onForward={async (selectedChatIds) => {
          if (forwardingMessage) {
            await forwardMessage(selectedChatIds, forwardingMessage.text || '', forwardingMessage.mediaUrl, forwardingMessage.mediaType);
          }
        }}
      />

      {reactionsDetailMessage && (
        <ReactionsDetailSheet
          message={messages.find(m => m._id === reactionsDetailMessage._id) || reactionsDetailMessage}
          currentUserId={currentUserId}
          onClose={() => setReactionsDetailMessage(null)}
          onToggleReaction={(emoji) => {
            const live = messages.find(m => m._id === reactionsDetailMessage._id) || reactionsDetailMessage;
            handleToggleReaction(live, emoji);
          }}
        />
      )}

      {chat && (
        <ChatSidebar
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
          chat={chat}
          currentUserId={currentUserId}
          onUpdateChat={(updated) => updated && setChat(updated)}
        />
      )}

      <ReadReceiptModal
        message={viewingReceiptsFor}
        onClose={() => setViewingReceiptsFor(null)}
        currentUserId={currentUserId}
        participants={chat?.participants || []}
      />

      {viewingMedia && (
        <MediaViewer
          visible={!!viewingMedia}
          onClose={() => setViewingMedia(null)}
          mediaUrl={viewingMedia.url}
          mediaType={viewingMedia.type}
        />
      )}
    </KeyboardAvoidingView>
  );
};

import { Modal } from 'react-native';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮'];

const ReactionsDetailSheet = ({ message, currentUserId, onClose, onToggleReaction }: {
  message: Message;
  currentUserId: string;
  onClose: () => void;
  onToggleReaction: (emoji: string) => void;
}) => {
  const reactions = message.reactions || [];

  const grouped = React.useMemo(() => {
    const map = new Map<string, { emoji: string; users: { userId: string; username: string; avatar?: string }[] }>();
    for (const r of reactions) {
      const cur = map.get(r.emoji) || { emoji: r.emoji, users: [] };
      cur.users.push({
        userId: r.userId,
        username: r.user?.username || (r.userId === currentUserId ? 'You' : 'Someone'),
        avatar: r.user?.avatar,
      });
      map.set(r.emoji, cur);
    }
    return Array.from(map.values());
  }, [reactions, currentUserId]);

  const [activeTab, setActiveTab] = React.useState<string>('all');

  const visibleRows = React.useMemo(() => {
    const rows: { emoji: string; userId: string; username: string; avatar?: string }[] = [];
    for (const g of grouped) {
      if (activeTab !== 'all' && activeTab !== g.emoji) continue;
      for (const u of g.users) rows.push({ emoji: g.emoji, ...u });
    }
    return rows;
  }, [grouped, activeTab]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.reactionsSheetOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.reactionsSheet} onPress={() => {}}>
          <View style={styles.reactionsSheetHandle} />
          <Text style={styles.reactionsSheetTitle}>Reactions</Text>

          {/* Emoji tabs */}
          <View style={styles.reactionsTabsRow}>
            <TouchableOpacity
              style={[styles.reactionsTab, activeTab === 'all' && styles.reactionsTabActive]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.reactionsTabText, activeTab === 'all' && styles.reactionsTabTextActive]}>
                All {reactions.length}
              </Text>
            </TouchableOpacity>
            {grouped.map((g) => (
              <TouchableOpacity
                key={g.emoji}
                style={[styles.reactionsTab, activeTab === g.emoji && styles.reactionsTabActive]}
                onPress={() => setActiveTab(g.emoji)}
              >
                <Text style={styles.reactionsTabEmoji}>{g.emoji}</Text>
                <Text style={[styles.reactionsTabText, activeTab === g.emoji && styles.reactionsTabTextActive]}>
                  {g.users.length}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={visibleRows}
            keyExtractor={(item, idx) => `${item.userId}-${item.emoji}-${idx}`}
            style={styles.reactionsList}
            renderItem={({ item }) => {
              const isMe = item.userId === currentUserId;
              return (
                <TouchableOpacity
                  style={styles.reactionUserRow}
                  activeOpacity={isMe ? 0.7 : 1}
                  disabled={!isMe}
                  onPress={() => { if (isMe) { onToggleReaction(item.emoji); } }}
                >
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.reactionUserAvatar} />
                  ) : (
                    <View style={[styles.reactionUserAvatar, styles.reactionUserAvatarFallback]}>
                      <Text style={styles.reactionUserAvatarText}>{(item.username || 'U').charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reactionUserName}>{isMe ? 'You' : item.username}</Text>
                    {isMe && <Text style={styles.reactionUserHint}>Tap to remove</Text>}
                  </View>
                  <Text style={styles.reactionRowEmoji}>{item.emoji}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const MessageContextMenu = ({ message, currentUserId, interactionDisabled, onClose, onMessageInfo, onReply, onEdit, onReact, onOpenFullPicker, onPin, onDelete, onForward, onReport, isOwn }: any) => {
  const myReactions: string[] = React.useMemo(
    () => (message.reactions || []).filter((r: any) => r.userId === currentUserId).map((r: any) => r.emoji),
    [message.reactions, currentUserId]
  );

  const canEdit = isOwn &&
                  !interactionDisabled &&
                  !message.isDeletedForEveryone &&
                  message.text &&
                  !message.mediaUrl &&
                  Date.now() - new Date(message.createdAt).getTime() < 15 * 60 * 1000;

  // When the conversation is read-only (block / deleted account), only allow
  // non-outgoing actions: view message info, delete your own, report theirs.
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
       <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
         <View style={styles.contextMenu}>
           {!interactionDisabled && (
             <>
               <View style={styles.emojiRow}>
                 {QUICK_EMOJIS.map(emoji => (
                   <TouchableOpacity
                     key={emoji}
                     onPress={() => onReact(emoji)}
                     style={[styles.emojiButton, myReactions.includes(emoji) && styles.emojiButtonActive]}
                   >
                     <Text style={styles.emojiText}>{emoji}</Text>
                   </TouchableOpacity>
                 ))}
                 <TouchableOpacity onPress={onOpenFullPicker} style={[styles.emojiButton, styles.emojiPlusButton]}>
                   <Feather name="plus" size={20} color="#a1a1aa" />
                 </TouchableOpacity>
               </View>
               <View style={styles.menuDivider} />
               <TouchableOpacity style={styles.contextMenuItem} onPress={onReply}>
                 <Feather name="corner-up-left" size={20} color="#f4f4f5" />
                 <Text style={styles.contextMenuItemText}>Reply</Text>
               </TouchableOpacity>

               {canEdit && (
                 <TouchableOpacity style={styles.contextMenuItem} onPress={onEdit}>
                   <Feather name="edit-2" size={20} color="#f4f4f5" />
                   <Text style={styles.contextMenuItemText}>Edit</Text>
                 </TouchableOpacity>
               )}

               <TouchableOpacity style={styles.contextMenuItem} onPress={onPin}>
                 <Feather
                   name="map-pin"
                   size={20}
                   color={message.isPinned ? "#ef4444" : "#f4f4f5"}
                   style={message.isPinned ? { transform: [{ rotate: '45deg' }] } : undefined}
                 />
                 <Text style={[styles.contextMenuItemText, message.isPinned && { color: '#ef4444' }]}>
                   {message.isPinned ? "Unpin" : "Pin"}
                 </Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.contextMenuItem} onPress={onForward}>
                 <Feather name="corner-up-right" size={20} color="#f4f4f5" />
                 <Text style={styles.contextMenuItemText}>Forward</Text>
               </TouchableOpacity>
             </>
           )}
           {isOwn && !message.isDeletedForEveryone && (
             <TouchableOpacity style={styles.contextMenuItem} onPress={onMessageInfo}>
               <Feather name="info" size={20} color="#f4f4f5" />
               <Text style={styles.contextMenuItemText}>Message Info</Text>
             </TouchableOpacity>
           )}
           {!isOwn && (
             <TouchableOpacity style={styles.contextMenuItem} onPress={onReport}>
               <Feather name="alert-triangle" size={20} color="#f59e0b" />
               <Text style={[styles.contextMenuItemText, { color: '#f59e0b' }]}>Report Message</Text>
             </TouchableOpacity>
           )}
           {isOwn && (
             <TouchableOpacity style={styles.contextMenuItem} onPress={onDelete}>
               <Feather name="trash-2" size={20} color="#ef4444" />
               <Text style={[styles.contextMenuItemText, { color: '#ef4444' }]}>Delete</Text>
             </TouchableOpacity>
           )}
         </View>
       </TouchableOpacity>
    </Modal>
  )
}

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
  headerAvatarWrap: {
    marginRight: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionBtn: {
    padding: 8,
    marginLeft: 4,
  },
  // Pinned Messages Banner styles
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 20,
  },
  pinnedBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinnedBannerIcon: {
    marginRight: 12,
    transform: [{ rotate: '45deg' }],
  },
  pinnedBannerTextContainer: {
    flex: 1,
  },
  pinnedBannerHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 2,
  },
  pinnedBannerContent: {
    fontSize: 13,
    color: '#a1a1aa',
  },
  pinnedBannerUnpinButton: {
    padding: 8,
    marginLeft: 8,
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
    fontSize: 15,
  },
  unreadSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    marginHorizontal: 16,
  },
  unreadLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  unreadSeparatorText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginHorizontal: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
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
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  loadMoreText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '500',
  },
  introHeader: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  introAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 14,
  },
  introAvatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
  },
  introName: {
    color: '#f4f4f5',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  introSubtitle: {
    color: '#71717a',
    fontSize: 14,
    marginBottom: 18,
  },
  introButton: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 10,
  },
  introButtonText: {
    color: '#e4e4e7',
    fontSize: 14,
    fontWeight: '600',
  },
  newMessageBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    zIndex: 10,
  },
  newMessageBadgeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  newMessageCount: {
    position: 'absolute',
    top: -4,
    left: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#09090b',
  },
  newMessageCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
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
  disabledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
    backgroundColor: '#09090b',
  },
  disabledBannerText: {
    color: '#a1a1aa',
    fontSize: 13,
    textAlign: 'center',
    flexShrink: 1,
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
  attachButton: {
    width: 40,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    marginHorizontal: 12,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  replyPreviewTitle: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: 'bold',
  },
  replyPreviewText: {
    color: '#a1a1aa',
    fontSize: 14,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextMenu: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    width: 250,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  emojiButton: {
    padding: 6,
    borderRadius: 20,
  },
  emojiButtonActive: {
    backgroundColor: 'rgba(37,99,235,0.25)',
  },
  emojiPlusButton: {
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#27272a',
    marginVertical: 8,
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  contextMenuItemText: {
    color: '#f4f4f5',
    fontSize: 16,
    marginLeft: 12,
  },
  recordingBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  recordingTimer: {
    color: '#f4f4f5',
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 36,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    gap: 2,
  },
  waveformBar: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
    height: '100%',
  },
  recordingCancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingIndicatorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  typingIndicatorText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontStyle: 'italic',
  },
  reactionsSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  reactionsSheet: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '70%',
  },
  reactionsSheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3f3f46',
    marginBottom: 12,
  },
  reactionsSheetTitle: {
    color: '#f4f4f5',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  reactionsTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },
  reactionsTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#27272a',
    gap: 4,
  },
  reactionsTabActive: {
    backgroundColor: 'rgba(37,99,235,0.25)',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  reactionsTabEmoji: {
    fontSize: 15,
  },
  reactionsTabText: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '600',
  },
  reactionsTabTextActive: {
    color: '#93c5fd',
  },
  reactionsList: {
    paddingHorizontal: 8,
  },
  reactionUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  reactionUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reactionUserAvatarFallback: {
    backgroundColor: '#3f3f46',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionUserAvatarText: {
    color: '#e4e4e7',
    fontSize: 16,
    fontWeight: '700',
  },
  reactionUserName: {
    color: '#f4f4f5',
    fontSize: 15,
    fontWeight: '600',
  },
  reactionUserHint: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 1,
  },
  reactionRowEmoji: {
    fontSize: 22,
  },
});