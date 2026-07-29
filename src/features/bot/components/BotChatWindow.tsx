import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Keyboard, Platform, Image, Alert, Animated,
  Modal, TouchableWithoutFeedback, Share, ScrollView,
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { botApi, BotSendError } from '../api';
import { BotChat, BotMessage } from '../types';
import { BotMarkdown } from './BotMarkdown';
import { useBotAttachments } from '../hooks/useBotAttachments';
import { useAuthContext } from '../../auth/context/AuthContext';

const SUGGESTIONS: { icon: keyof typeof Feather.glyphMap; text: string; tint: string }[] = [
  { icon: 'help-circle', text: 'What can you help me with?', tint: '#3b82f6' },
  { icon: 'phone', text: 'How do I start a video call?', tint: '#10b981' },
  { icon: 'shield', text: 'How do I enable Two-Factor Authentication?', tint: '#f59e0b' },
  { icon: 'code', text: 'Help me debug my code', tint: '#8b5cf6' },
  { icon: 'edit-3', text: 'Help me write a professional message', tint: '#f43f5e' },
  { icon: 'droplet', text: 'How do I customize my chat theme?', tint: '#06b6d4' },
];

const STREAMING_ID = 'streaming-bot-message';
const PLACEHOLDER_TEXT = /^(📷 Sent an image|🎥 Sent a video|🎤 Sent a voice message)$/;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds >= 3600) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

function formatRecording(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function isPlaceholderOnly(message: BotMessage): boolean {
  return !!message.attachments?.length && PLACEHOLDER_TEXT.test(message.text || '');
}

function conversationToText(title: string, messages: BotMessage[]): string {
  const body = messages
    .filter(m => m.text && !isPlaceholderOnly(m))
    .map(m => `${m.role === 'user' ? 'You' : 'VokiToki AI'}: ${m.text}`)
    .join('\n\n');
  return `${title}\n\n${body}`;
}

function TypingDots() {
  const anims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(anim, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 320, useNativeDriver: true }),
          Animated.delay((2 - i) * 160),
        ])
      )
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <View style={styles.typingDots}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.typingDot,
            {
              opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

export function BotChatWindow({ chatId }: { chatId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthContext();
  const isNewChat = chatId === 'new';

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    // The home-indicator/nav-bar inset only needs padding when the keyboard
    // is closed — when it's open, the keyboard itself occupies that space
    // and KeyboardAvoidingView already accounts for the keyboard's height,
    // so adding insets.bottom on top of that double-pads the input bar.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [currentChatId, setCurrentChatId] = useState<string | null>(isNewChat ? null : chatId);
  const [chat, setChat] = useState<BotChat | null>(null);
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(!isNewChat);
  const [sending, setSending] = useState(false);
  const [streamStarted, setStreamStarted] = useState(false);
  const [modelName, setModelName] = useState('Gemini');
  const [rateLimit, setRateLimit] = useState<{ type: 'rpm' | 'rpd'; seconds: number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherChats, setSwitcherChats] = useState<BotChat[]>([]);
  const [switcherLoading, setSwitcherLoading] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);
  const rateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesRef = useRef<BotMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const {
    pendingAttachment, setPendingAttachment, clearAttachment, preparing,
    pickFromLibrary, pickFromCamera,
    isRecording, recordingSeconds, startRecording, stopRecording,
  } = useBotAttachments();

  useEffect(() => {
    if (isNewChat) return;
    const fetchChat = async () => {
      try {
        const res = await botApi.getChat(chatId);
        setChat(res);
        setMessages(res.messages || []);
      } catch {
        Alert.alert('Error', 'Failed to load this chat.');
      } finally {
        setLoading(false);
      }
    };
    fetchChat();
  }, [chatId, isNewChat]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (rateTimerRef.current) clearInterval(rateTimerRef.current);
    };
  }, []);

  const startRateLimitCountdown = (type: 'rpm' | 'rpd', seconds: number) => {
    setRateLimit({ type, seconds });
    if (rateTimerRef.current) clearInterval(rateTimerRef.current);
    rateTimerRef.current = setInterval(() => {
      setRateLimit(prev => {
        if (!prev || prev.seconds <= 1) {
          if (rateTimerRef.current) clearInterval(rateTimerRef.current);
          rateTimerRef.current = null;
          return null;
        }
        return { ...prev, seconds: prev.seconds - 1 };
      });
    }, 1000);
  };

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  const sendMessage = useCallback(async (overrideText?: string, fromIndex?: number) => {
    const isResend = fromIndex !== undefined;
    const text = (overrideText ?? inputText).trim();
    const attachment = isResend ? null : pendingAttachment;
    if ((!text && !attachment) || sending || rateLimit) return;

    if (!isResend) {
      setInputText('');
      clearAttachment();
    }
    setEditingIndex(null);
    setSending(true);
    setStreamStarted(false);

    const controller = new AbortController();
    abortRef.current = controller;

    // Lazily create the chat on first message (like the web composer).
    let targetChatId = currentChatId;
    let createdChat: BotChat | null = null;
    if (!targetChatId) {
      try {
        const defaultTitle = attachment?.type === 'image'
          ? 'Image analysis'
          : attachment?.type === 'video'
            ? 'Video analysis'
            : attachment?.type === 'audio'
              ? 'Voice message'
              : undefined;
        createdChat = await botApi.createChat(text || defaultTitle);
        targetChatId = createdChat._id;
        setCurrentChatId(targetChatId);
        setChat(createdChat);
      } catch {
        Alert.alert('Error', 'Failed to start a new chat.');
        setInputText(text);
        if (attachment) setPendingAttachment(attachment);
        setSending(false);
        abortRef.current = null;
        return;
      }
    }

    const fallbackText = attachment?.type === 'image'
      ? '📷 Sent an image'
      : attachment?.type === 'video'
        ? '🎥 Sent a video'
        : attachment?.type === 'audio'
          ? '🎤 Sent a voice message'
          : '';

    const tempUserMsg: BotMessage = {
      _id: `temp-user-${Date.now()}`,
      role: 'user',
      text: text || fallbackText,
      attachments: attachment ? [{
        type: attachment.type,
        mimeType: attachment.mimeType,
        fileName: attachment.fileName,
        thumbnailB64: attachment.type === 'image' ? attachment.previewUri : undefined,
      }] : undefined,
      createdAt: new Date().toISOString(),
    };
    // Restores the pre-truncation list if the resend never reaches the server.
    const messagesBeforeSend = isResend ? messagesRef.current : null;

    // With fromIndex the server truncates its own history, so the local list
    // must drop that turn and everything after it before appending the new one.
    setMessages(prev => [...(isResend ? prev.slice(0, fromIndex) : prev), tempUserMsg]);
    scrollToEnd();

    let streamedText = '';

    try {
      await botApi.sendMessageStream(
        targetChatId!,
        {
          text,
          attachments: attachment ? [{
            mimeType: attachment.mimeType,
            data: attachment.data,
            fileName: attachment.fileName,
          }] : undefined,
          ...(isResend ? { fromIndex } : {}),
        },
        {
          onInit: serverUserMsg => {
            setMessages(prev => prev.map(m => {
              if (m._id !== tempUserMsg._id) return m;
              // Keep the local preview if the server didn't build a thumbnail.
              const serverHasThumb = !!serverUserMsg.attachments?.[0]?.thumbnailB64;
              if (!serverHasThumb && m.attachments?.[0]?.thumbnailB64) {
                return { ...serverUserMsg, attachments: m.attachments };
              }
              return serverUserMsg;
            }));
          },
          onChunk: piece => {
            streamedText += piece;
            setStreamStarted(true);
            setMessages(prev => {
              const withoutStream = prev.filter(m => m._id !== STREAMING_ID);
              return [...withoutStream, {
                _id: STREAMING_ID,
                role: 'model' as const,
                text: streamedText,
                createdAt: new Date().toISOString(),
              }];
            });
            scrollToEnd();
          },
          onDone: (botMessage, chatTitle, model) => {
            if (model) setModelName(model);
            setMessages(prev => {
              const withoutStream = prev.filter(m => m._id !== STREAMING_ID);
              if (botMessage) return [...withoutStream, botMessage];
              if (streamedText) {
                return [...withoutStream, {
                  _id: `bot-${Date.now()}`,
                  role: 'model' as const,
                  text: streamedText,
                  createdAt: new Date().toISOString(),
                }];
              }
              return withoutStream;
            });
            if (chatTitle) {
              setChat(prev => (prev ? { ...prev, title: chatTitle } : prev));
            }
            scrollToEnd();
          },
        },
        controller.signal
      );
    } catch (err) {
      const sendError = err as BotSendError;
      if (sendError?.kind === 'rate-limit') {
        // Restore the draft like the web app and start the countdown.
        setInputText(text);
        if (attachment) setPendingAttachment(attachment);
        setMessages(prev => (
          messagesBeforeSend ?? prev.filter(m => m._id !== tempUserMsg._id && m._id !== STREAMING_ID)
        ));
        startRateLimitCountdown(sendError.limitType, sendError.retryAfter);
      } else {
        const errorLine = `\n\n**⚠️ Error:** ${sendError?.message || 'Something went wrong.'}`;
        setMessages(prev => {
          const withoutStream = prev.filter(m => m._id !== STREAMING_ID);
          return [...withoutStream, {
            _id: `bot-error-${Date.now()}`,
            role: 'model' as const,
            text: (streamedText || '') + errorLine,
            createdAt: new Date().toISOString(),
          }];
        });
      }
    } finally {
      // If the stream was stopped mid-way, keep the partial reply as a normal message.
      setMessages(prev => prev.map(m => (
        m._id === STREAMING_ID ? { ...m, _id: `bot-${Date.now()}` } : m
      )));
      setSending(false);
      setStreamStarted(false);
      abortRef.current = null;
    }
  }, [inputText, pendingAttachment, sending, rateLimit, currentChatId, clearAttachment, setPendingAttachment, scrollToEnd]);

  const stopGenerating = () => {
    abortRef.current?.abort();
  };

  const startNewChat = () => {
    abortRef.current?.abort();
    setCurrentChatId(null);
    setChat(null);
    setMessages([]);
    setInputText('');
    setEditingIndex(null);
    clearAttachment();
  };

  const handleCopyMessage = async (message: BotMessage) => {
    if (!message.text) return;
    try {
      await Clipboard.setStringAsync(message.text);
      setCopiedId(message._id || null);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  const handleShareConversation = async () => {
    if (messages.length === 0) return;
    try {
      await Share.share({
        title: chat?.title || 'AI conversation',
        message: conversationToText(chat?.title || 'AI conversation', messages),
      });
    } catch {
      // user dismissed the share sheet
    }
  };

  const openSwitcher = async () => {
    setSwitcherOpen(true);
    setSwitcherLoading(true);
    try {
      const res = await botApi.getChats();
      setSwitcherChats(res.chats || []);
    } catch {
      setSwitcherChats([]);
    } finally {
      setSwitcherLoading(false);
    }
  };

  const startEdit = (index: number, message: BotMessage) => {
    setEditDraft(message.text || '');
    setEditingIndex(index);
  };

  const submitEdit = (index: number) => {
    const next = editDraft.trim();
    if (!next) return;
    sendMessage(next, index);
  };

  const renderAttachment = (message: BotMessage) => {
    const att = message.attachments?.[0];
    if (!att) return null;
    if (att.type === 'image' && att.thumbnailB64) {
      return <Image source={{ uri: att.thumbnailB64 }} style={styles.attachmentImage} />;
    }
    if (att.type === 'video') {
      return (
        <View style={styles.attachmentChip}>
          {att.thumbnailB64 ? (
            <Image source={{ uri: att.thumbnailB64 }} style={styles.attachmentVideoThumb} />
          ) : (
            <Feather name="video" size={15} color="#e4e4e7" />
          )}
          <Text style={styles.attachmentChipText} numberOfLines={1}>{att.fileName}</Text>
        </View>
      );
    }
    if (att.type === 'audio') {
      return (
        <View style={styles.attachmentChip}>
          <Feather name="mic" size={15} color="#e4e4e7" />
          <Text style={styles.attachmentChipText} numberOfLines={1}>Voice message</Text>
        </View>
      );
    }
    if (att.type === 'image') {
      return (
        <View style={styles.attachmentChip}>
          <Feather name="image" size={15} color="#e4e4e7" />
          <Text style={styles.attachmentChipText} numberOfLines={1}>{att.fileName}</Text>
        </View>
      );
    }
    return null;
  };

  const renderActionRow = (message: BotMessage, extra?: React.ReactNode) => {
    const copied = copiedId === message._id;
    return (
      <View style={styles.actionRow}>
        <Text style={styles.timestamp}>{formatTime(message.createdAt)}</Text>
        {!!message.text && !isPlaceholderOnly(message) && (
          <TouchableOpacity
            onPress={() => handleCopyMessage(message)}
            style={styles.actionButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={copied ? 'check' : 'copy'}
              size={12}
              color={copied ? '#34d399' : '#71717a'}
            />
            <Text style={[styles.actionText, copied && { color: '#34d399' }]}>
              {copied ? 'Copied' : 'Copy'}
            </Text>
          </TouchableOpacity>
        )}
        {extra}
      </View>
    );
  };

  const renderMessage = ({ item, index }: { item: BotMessage; index: number }) => {
    const isUser = item.role === 'user';
    const isStreaming = item._id === STREAMING_ID;

    if (isUser) {
      if (editingIndex === index) {
        return (
          <View style={styles.editWrap}>
            <TextInput
              style={styles.editInput}
              value={editDraft}
              onChangeText={setEditDraft}
              multiline
              autoFocus
              maxLength={4000}
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.editCancel} onPress={() => setEditingIndex(null)}>
                <Feather name="x" size={14} color="#a1a1aa" />
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editSave, !editDraft.trim() && { opacity: 0.5 }]}
                onPress={() => submitEdit(index)}
                disabled={!editDraft.trim()}
              >
                <Feather name="send" size={14} color="#fff" />
                <Text style={styles.editSaveText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      const canEdit = !sending && !item._id?.startsWith('temp-') && !!item.text && !isPlaceholderOnly(item);

      return (
        <View style={styles.userRow}>
          <View style={styles.userCard}>
            {renderAttachment(item)}
            {!!item.text && !isPlaceholderOnly(item) && (
              <Text style={styles.userText}>{item.text}</Text>
            )}
          </View>
          {renderActionRow(item, canEdit ? (
            <TouchableOpacity
              onPress={() => startEdit(index, item)}
              style={styles.actionButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="edit-2" size={12} color="#60a5fa" />
              <Text style={[styles.actionText, { color: '#60a5fa' }]}>Edit</Text>
            </TouchableOpacity>
          ) : null)}
        </View>
      );
    }

    return (
      <View style={styles.botRow}>
        <View style={styles.botHeader}>
          <LinearGradient
            colors={['#2563eb', '#9333ea']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.botAvatar}
          >
            <MaterialIcons name="auto-awesome" size={13} color="#fff" />
          </LinearGradient>
          <Text style={styles.botName}>VokiToki AI</Text>
          <Text style={styles.timestamp}>{formatTime(item.createdAt)}</Text>
        </View>
        <View style={styles.botBody}>
          <BotMarkdown text={item.text} />
          {isStreaming && <View style={styles.streamingCursor} />}
        </View>
        {!isStreaming && !!item.text && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => handleCopyMessage(item)}
              style={styles.actionButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather
                name={copiedId === item._id ? 'check' : 'copy'}
                size={12}
                color={copiedId === item._id ? '#34d399' : '#71717a'}
              />
              <Text style={[styles.actionText, copiedId === item._id && { color: '#34d399' }]}>
                {copiedId === item._id ? 'Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const greeting = user?.name || user?.username || 'there';
  const showEmptyState = !loading && messages.length === 0;
  const waitingFirstChunk = sending && !streamStarted;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="arrow-left" size={22} color="#f4f4f5" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerCenter} onPress={openSwitcher} activeOpacity={0.7}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {chat?.title || 'New AI Chat'}
            </Text>
            <Feather name="chevron-down" size={15} color="#a1a1aa" />
          </View>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{modelName}</Text>
        </TouchableOpacity>
        {messages.length > 0 && (
          <TouchableOpacity
            onPress={handleShareConversation}
            style={styles.iconButton}
            accessibilityLabel="Share this conversation"
          >
            <Feather name="share-2" size={19} color="#a1a1aa" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={startNewChat}
          style={styles.iconButton}
          accessibilityLabel="Start a new chat"
        >
          <Feather name="plus" size={22} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : showEmptyState ? (
        <View style={styles.emptyState}>
          <LinearGradient
            colors={['#2563eb', '#9333ea']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyIcon}
          >
            <MaterialIcons name="auto-awesome" size={30} color="#fff" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>Hey {greeting} 👋</Text>
          <Text style={styles.emptySubtitle}>How can I help you today?</Text>
          <Text style={styles.emptyDisclaimer}>
            Answers are generated automatically and can be wrong or incomplete. This isn’t
            professional advice — check anything important before you rely on it.
          </Text>
          <View style={styles.suggestionsGrid}>
            {SUGGESTIONS.map(suggestion => (
              <TouchableOpacity
                key={suggestion.text}
                style={styles.suggestionChip}
                onPress={() => sendMessage(suggestion.text)}
                activeOpacity={0.7}
              >
                <Feather name={suggestion.icon} size={15} color={suggestion.tint} />
                <Text style={styles.suggestionText} numberOfLines={2}>{suggestion.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item._id || `msg-${index}`}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          ItemSeparatorComponent={() => <View style={styles.messageSeparator} />}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            waitingFirstChunk ? (
              <View style={styles.botRow}>
                <View style={styles.botHeader}>
                  <LinearGradient
                    colors={['#2563eb', '#9333ea']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.botAvatar}
                  >
                    <MaterialIcons name="auto-awesome" size={13} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.botName}>VokiToki AI</Text>
                </View>
                <View style={styles.typingWrap}>
                  <TypingDots />
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* Rate limit banner */}
      {rateLimit && (
        <View style={styles.rateLimitBanner}>
          <Feather name="clock" size={15} color="#f59e0b" />
          <Text style={styles.rateLimitText}>
            {rateLimit.type === 'rpd'
              ? `Daily AI limit reached. Try again in ${formatCountdown(rateLimit.seconds)}.`
              : `Slow down! You can send again in ${formatCountdown(rateLimit.seconds)}.`}
          </Text>
        </View>
      )}

      {/* Pending attachment preview */}
      {pendingAttachment && !isRecording && (
        <View style={styles.pendingBar}>
          {pendingAttachment.type === 'image' ? (
            <Image source={{ uri: pendingAttachment.previewUri }} style={styles.pendingThumb} />
          ) : (
            <View style={styles.pendingIconWrap}>
              <Feather
                name={pendingAttachment.type === 'video' ? 'video' : 'mic'}
                size={17}
                color="#a5b4fc"
              />
            </View>
          )}
          <View style={styles.pendingInfo}>
            <Text style={styles.pendingName} numberOfLines={1}>
              {pendingAttachment.type === 'audio' ? 'Voice message' : pendingAttachment.fileName}
            </Text>
            <Text style={styles.pendingSize}>
              {pendingAttachment.durationSec
                ? formatRecording(pendingAttachment.durationSec)
                : `${(pendingAttachment.sizeBytes / (1024 * 1024)).toFixed(1)}MB`}
            </Text>
          </View>
          <TouchableOpacity onPress={clearAttachment} style={styles.pendingRemove}>
            <Feather name="x" size={16} color="#f4f4f5" />
          </TouchableOpacity>
        </View>
      )}

      {/* Attach menu */}
      {attachMenuOpen && !isRecording && (
        <View style={styles.attachMenu}>
          <TouchableOpacity
            style={styles.attachOption}
            onPress={() => { setAttachMenuOpen(false); pickFromLibrary(); }}
          >
            <View style={[styles.attachOptionIcon, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
              <Feather name="image" size={17} color="#3b82f6" />
            </View>
            <Text style={styles.attachOptionText}>Photo or Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.attachOption}
            onPress={() => { setAttachMenuOpen(false); pickFromCamera(); }}
          >
            <View style={[styles.attachOptionIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
              <Feather name="camera" size={17} color="#10b981" />
            </View>
            <Text style={styles.attachOptionText}>Take a Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Composer */}
      {isRecording ? (
        <View style={[styles.composerBar, { paddingBottom: 10 + (keyboardVisible ? 0 : insets.bottom) }]}>
          <View style={styles.recordingPill}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTime}>{formatRecording(recordingSeconds)}</Text>
            <Text style={styles.recordingHint}>Recording voice message…</Text>
            <TouchableOpacity
              onPress={() => stopRecording(true)}
              style={styles.recordingCancel}
              accessibilityLabel="Discard recording"
            >
              <Feather name="trash-2" size={18} color="#ef4444" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => stopRecording(false)}
              style={styles.recordingStop}
              accessibilityLabel="Finish recording"
            >
              <Feather name="check" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.composerBar, { paddingBottom: 10 + (keyboardVisible ? 0 : insets.bottom) }]}>
          <View style={styles.composerPill}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={() => setAttachMenuOpen(open => !open)}
              disabled={sending || preparing}
            >
              {preparing ? (
                <ActivityIndicator size="small" color="#71717a" />
              ) : (
                <Feather name={attachMenuOpen ? 'x' : 'paperclip'} size={20} color="#a1a1aa" />
              )}
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Message AI…"
              placeholderTextColor="#71717a"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={4000}
              editable={!rateLimit}
            />
            {sending ? (
              <TouchableOpacity style={[styles.sendButton, styles.stopButton]} onPress={stopGenerating}>
                <Feather name="square" size={16} color="#fff" />
              </TouchableOpacity>
            ) : inputText.trim() || pendingAttachment ? (
              <TouchableOpacity
                style={[styles.sendButton, !!rateLimit && styles.sendButtonDisabled]}
                onPress={() => sendMessage()}
                disabled={!!rateLimit}
              >
                <Feather name="send" size={17} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.micButton}
                onPress={startRecording}
                disabled={!!rateLimit}
              >
                <Feather name="mic" size={19} color="#a1a1aa" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.composerFooter}>
            VokiToki AI · {modelName} · AI can make mistakes — verify important info
          </Text>
        </View>
      )}

      {/* Chat switcher sheet */}
      <Modal
        visible={switcherOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSwitcherOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSwitcherOpen(false)}>
          <View style={styles.sheetOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Your AI chats</Text>
                <TouchableOpacity
                  style={styles.sheetNewChat}
                  onPress={() => { setSwitcherOpen(false); startNewChat(); }}
                >
                  <View style={styles.sheetNewChatIcon}>
                    <Feather name="plus" size={16} color="#2563eb" />
                  </View>
                  <Text style={styles.sheetNewChatText}>New chat</Text>
                </TouchableOpacity>
                <View style={styles.sheetDivider} />
                {switcherLoading ? (
                  <View style={styles.sheetLoading}>
                    <ActivityIndicator color="#2563eb" />
                  </View>
                ) : switcherChats.length === 0 ? (
                  <Text style={styles.sheetEmpty}>No other conversations yet.</Text>
                ) : (
                  <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
                    {switcherChats.map(c => {
                      const isCurrent = c._id === currentChatId;
                      return (
                        <TouchableOpacity
                          key={c._id}
                          style={[styles.sheetItem, isCurrent && styles.sheetItemActive]}
                          onPress={() => {
                            setSwitcherOpen(false);
                            if (!isCurrent) router.replace(`/bot/${c._id}`);
                          }}
                        >
                          <Feather
                            name={c.pinned ? 'bookmark' : 'message-square'}
                            size={14}
                            color={isCurrent ? '#60a5fa' : '#71717a'}
                          />
                          <Text
                            style={[styles.sheetItemText, isCurrent && { color: '#60a5fa' }]}
                            numberOfLines={1}
                          >
                            {c.title || 'New Chat'}
                          </Text>
                          {isCurrent && <Feather name="check" size={14} color="#60a5fa" />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 46,
    paddingBottom: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    backgroundColor: '#18181b',
  },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#f4f4f5', maxWidth: '80%' },
  headerSubtitle: { fontSize: 11, color: '#71717a', marginTop: 1, fontWeight: '600' },
  iconButton: { padding: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Empty state */
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: '#f4f4f5' },
  emptySubtitle: { fontSize: 14, color: '#a1a1aa', marginTop: 4 },
  emptyDisclaimer: {
    fontSize: 11,
    lineHeight: 16,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 11,
    width: '47%',
  },
  suggestionText: { flex: 1, fontSize: 12, color: '#d4d4d8', fontWeight: '600', lineHeight: 16 },

  /* Messages */
  messageList: { padding: 16, paddingBottom: 24 },
  messageSeparator: { height: 1, backgroundColor: 'rgba(39,39,42,0.6)', marginVertical: 14 },

  userRow: { alignSelf: 'flex-end', maxWidth: '88%', alignItems: 'flex-end' },
  userCard: {
    backgroundColor: 'rgba(37,99,235,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.3)',
    borderRadius: 18,
    borderTopRightRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  userText: { fontSize: 15, lineHeight: 22, color: '#f4f4f5' },

  botRow: { alignSelf: 'stretch' },
  botHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  botAvatar: {
    width: 24,
    height: 24,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botName: { fontSize: 12, fontWeight: '800', color: '#f4f4f5' },
  botBody: { paddingRight: 2 },
  typingWrap: { paddingVertical: 6 },
  streamingCursor: {
    width: 8,
    height: 15,
    borderRadius: 2,
    backgroundColor: '#2563eb',
    marginTop: 4,
  },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 7 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 10, fontWeight: '700', color: '#71717a' },
  timestamp: { fontSize: 10, color: '#52525b', fontWeight: '600' },
  typingDots: { flexDirection: 'row', gap: 5, alignItems: 'flex-end' },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#818cf8' },

  /* Inline edit */
  editWrap: {
    alignSelf: 'flex-end',
    maxWidth: '95%',
    minWidth: '70%',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.5)',
    borderRadius: 18,
    padding: 10,
  },
  editInput: {
    color: '#f4f4f5',
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 160,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  editCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: '#27272a',
  },
  editCancelText: { fontSize: 12, fontWeight: '700', color: '#a1a1aa' },
  editSave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: '#2563eb',
  },
  editSaveText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  /* Attachments in messages */
  attachmentImage: { width: 180, height: 180, borderRadius: 12, marginBottom: 6 },
  attachmentVideoThumb: { width: 34, height: 34, borderRadius: 8 },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: 220,
  },
  attachmentChipText: { fontSize: 12, color: '#e4e4e7', fontWeight: '600', flexShrink: 1 },

  /* Rate limit */
  rateLimitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 14,
  },
  rateLimitText: { flex: 1, fontSize: 12, color: '#fbbf24', fontWeight: '700' },

  /* Pending attachment */
  pendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 14,
  },
  pendingThumb: { width: 42, height: 42, borderRadius: 10 },
  pendingIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingInfo: { flex: 1 },
  pendingName: { fontSize: 13, fontWeight: '700', color: '#f4f4f5' },
  pendingSize: { fontSize: 11, color: '#71717a', marginTop: 1 },
  pendingRemove: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Attach menu */
  attachMenu: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  attachOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  attachOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachOptionText: { fontSize: 14, fontWeight: '600', color: '#f4f4f5' },

  /* Composer */
  composerBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#09090b',
  },
  composerPill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 26,
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  composerFooter: {
    fontSize: 10,
    color: '#52525b',
    textAlign: 'center',
    marginTop: 7,
    fontWeight: '600',
  },
  attachButton: {
    width: 40,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: '#f4f4f5',
    paddingHorizontal: 4,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 15,
    maxHeight: 120,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: { backgroundColor: '#ef4444' },
  sendButtonDisabled: { opacity: 0.5 },
  micButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Recording */
  recordingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 26,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
  recordingTime: { fontSize: 14, fontWeight: '800', color: '#f4f4f5', fontVariant: ['tabular-nums'] },
  recordingHint: { flex: 1, fontSize: 12, color: '#71717a', fontWeight: '600' },
  recordingCancel: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingStop: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Chat switcher sheet */
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3f3f46',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 15, fontWeight: '800', color: '#f4f4f5', marginBottom: 12 },
  sheetNewChat: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10 },
  sheetNewChatIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: 'rgba(37,99,235,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetNewChatText: { fontSize: 14, fontWeight: '700', color: '#f4f4f5' },
  sheetDivider: { height: 1, backgroundColor: '#27272a', marginVertical: 6 },
  sheetLoading: { paddingVertical: 30, alignItems: 'center' },
  sheetEmpty: { fontSize: 13, color: '#71717a', paddingVertical: 20, textAlign: 'center' },
  sheetList: { marginTop: 4 },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  sheetItemActive: { backgroundColor: 'rgba(37,99,235,0.1)' },
  sheetItemText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#d4d4d8' },
});
