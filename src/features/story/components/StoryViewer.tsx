import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { StoryGroup } from '../types';
import { chatApi } from '../../chat/api';
import { ReportModal } from '../../../components/ReportModal';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { StoryViewersSheet } from './StoryViewersSheet';

const IMAGE_DURATION = 5000;
const QUICK_REACTIONS = ['😂', '😮', '😢', '😍', '👏', '🔥'];

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  initialStoryIndex?: number;
  currentUser: { _id: string; username: string; avatar?: string } | null;
  onClose: () => void;
  onViewed: (userId: string, storyId: string) => void;
  onDeleteStory?: (storyId: string) => Promise<void>;
}

// Floating emoji that rises up from the reply bar after a quick reaction,
// mirroring the web viewer's flying-emoji animation.
const FlyingEmoji = ({ emoji, x }: { emoji: string; x: number }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -340] });
  const opacity = anim.interpolate({ inputRange: [0, 0.12, 0.75, 1], outputRange: [0, 1, 1, 0] });
  const scale = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 1.4, 0.9] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.flyingEmoji, { opacity, transform: [{ translateX: x }, { translateY }, { scale }] }]}
    >
      <Text style={{ fontSize: 44 }}>{emoji}</Text>
    </Animated.View>
  );
};

export const StoryViewer = ({
  groups,
  initialGroupIndex,
  initialStoryIndex = 0,
  currentUser,
  onClose,
  onViewed,
  onDeleteStory,
}: StoryViewerProps) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(initialStoryIndex);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sentFlash, setSentFlash] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [flyingEmojis, setFlyingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressValueRef = useRef(0);
  const emojiIdRef = useRef(0);

  const group = groups[groupIndex];
  const story = group?.stories?.[storyIndex];
  const isVideo = story?.mediaType === 'video';
  const isOwner = !!currentUser && group?.user._id === currentUser._id;
  // Anything that overlays the story (sheets, modals, keyboard input) pauses it.
  const isPaused = paused || showViewers || showReport || confirmDelete || inputFocused || sending;

  useEffect(() => {
    const id = progressAnim.addListener(({ value }) => {
      progressValueRef.current = value;
    });
    return () => progressAnim.removeListener(id);
  }, [progressAnim]);

  // If stories get deleted while viewing (own delete or WS event), keep the
  // indices valid and close once nothing is left.
  useEffect(() => {
    if (!group || group.stories.length === 0) {
      onClose();
      return;
    }
    if (storyIndex >= group.stories.length) {
      setStoryIndex(group.stories.length - 1);
    }
  }, [group, storyIndex, onClose]);

  const goToNextStory = useCallback(() => {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex(i => i + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(g => g + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }, [group, storyIndex, groupIndex, groups.length, onClose]);

  const goToPrevStory = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(i => i - 1);
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex(g => g - 1);
      setStoryIndex(Math.max(0, prevGroup.stories.length - 1));
    }
  }, [storyIndex, groupIndex, groups]);

  // Mark the story viewed for other people's stories only.
  useEffect(() => {
    if (!story || !group || !currentUser || isOwner) return;
    const alreadyViewed =
      story.viewed || (story.viewedBy || []).some(v => v.userId === currentUser._id);
    if (!alreadyViewed) {
      onViewed(group.user._id, story._id);
    }
  }, [story?._id]);

  // Reset progress whenever the story changes.
  useEffect(() => {
    progressAnim.setValue(0);
    setMediaLoaded(false);
  }, [story?._id]);

  // Image auto-advance timer (videos drive progress from playback status).
  useEffect(() => {
    if (!story || isVideo) return;
    if (isPaused || !mediaLoaded) {
      progressAnim.stopAnimation();
      return;
    }
    const remaining = (1 - progressValueRef.current) * IMAGE_DURATION;
    const animation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: Math.max(remaining, 0),
      easing: (t) => t,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) goToNextStory();
    });
    return () => animation.stop();
  }, [story?._id, isVideo, isPaused, mediaLoaded, goToNextStory]);

  const handleVideoStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (!mediaLoaded && status.isPlaying) setMediaLoaded(true);
    if (status.durationMillis && status.positionMillis != null) {
      progressAnim.setValue(Math.min(status.positionMillis / status.durationMillis, 1));
    }
    if (status.didJustFinish) {
      goToNextStory();
    }
  }, [mediaLoaded, goToNextStory, progressAnim]);

  const triggerFlyingEmoji = useCallback((emoji: string) => {
    const id = emojiIdRef.current++;
    const x = Math.floor(Math.random() * 120) - 60;
    setFlyingEmojis(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFlyingEmojis(prev => prev.filter(item => item.id !== id));
    }, 2000);
  }, []);

  const handleSendReply = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending || !currentUser || !group || !story) return;

    if (QUICK_REACTIONS.includes(trimmed)) {
      triggerFlyingEmoji(trimmed);
    }

    setSending(true);
    try {
      const chat = await chatApi.createChat(group.user._id);
      await chatApi.sendMessage({
        chatId: chat._id,
        senderId: currentUser._id,
        text: trimmed,
        storyId: story._id,
        storyMediaUrl: story.mediaUrl,
        storyMediaType: story.mediaType,
        storyCaption: story.caption || '',
        storyExpiresAt: story.expiresAt,
      });
      setReplyText('');
      setSentFlash(true);
      setTimeout(() => setSentFlash(false), 1500);
    } catch {
      Alert.alert('Reply failed', 'Could not send your reply. Please try again.');
    } finally {
      setSending(false);
    }
  }, [sending, currentUser, group, story, triggerFlyingEmoji]);

  const handleDelete = useCallback(async () => {
    if (!story || !onDeleteStory) return;
    setDeleting(true);
    try {
      await onDeleteStory(story._id);
      setConfirmDelete(false);
    } catch {
      Alert.alert('Delete failed', 'Could not delete the story. Please try again.');
    } finally {
      setDeleting(false);
    }
  }, [story, onDeleteStory]);

  if (!group || !story) return null;

  const uniqueViewerIds = Array.from(new Set((story.viewedBy || []).map(v => v.userId)));
  const previewViewers = Array.from(
    new Map((story.viewedBy || []).map(v => [v.userId, v])).values()
  ).slice(0, 3);

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Media */}
        <View style={styles.mediaContainer}>
          {isVideo ? (
            <Video
              key={story._id}
              source={{ uri: story.mediaUrl }}
              style={styles.media}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={!isPaused}
              isMuted={muted}
              onPlaybackStatusUpdate={handleVideoStatus}
              onLoad={() => setMediaLoaded(true)}
            />
          ) : (
            <Image
              key={story._id}
              source={{ uri: story.mediaUrl }}
              style={styles.media}
              resizeMode="contain"
              onLoad={() => setMediaLoaded(true)}
            />
          )}
          {!mediaLoaded && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}
        </View>

        {/* Tap zones: left = previous, right = next, long-press = pause */}
        <View style={styles.tapZones}>
          <Pressable
            style={styles.tapZoneLeft}
            onPress={goToPrevStory}
            onLongPress={() => setPaused(true)}
            onPressOut={() => setPaused(false)}
            delayLongPress={200}
          />
          <Pressable
            style={styles.tapZoneRight}
            onPress={goToNextStory}
            onLongPress={() => setPaused(true)}
            onPressOut={() => setPaused(false)}
            delayLongPress={200}
          />
        </View>

        {/* Progress bars */}
        <View style={styles.progressRow}>
          {group.stories.map((s, idx) => (
            <View key={s._id} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      idx < storyIndex
                        ? '100%'
                        : idx === storyIndex
                        ? progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            {group.user.avatar ? (
              <Image source={{ uri: group.user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{group.user.username.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View>
              <Text style={styles.username}>{group.user.username}</Text>
              <Text style={styles.storyTime}>
                {new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {!isOwner && (
              <TouchableOpacity
                onPress={() => setShowReport(true)}
                style={styles.headerButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="shield" size={20} color="rgba(245, 158, 11, 0.9)" />
              </TouchableOpacity>
            )}
            {isVideo && (
              <TouchableOpacity
                onPress={() => setMuted(m => !m)}
                style={styles.headerButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name={muted ? 'volume-x' : 'volume-2'} size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onClose}
              style={styles.headerButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Flying reactions */}
        {flyingEmojis.map(item => (
          <FlyingEmoji key={item.id} emoji={item.emoji} x={item.x} />
        ))}

        {/* Reply sent flash */}
        {sentFlash && (
          <View style={styles.sentFlash}>
            <Feather name="check-circle" size={40} color="#34d399" />
            <Text style={styles.sentFlashText}>Response Sent</Text>
          </View>
        )}

        {/* Bottom: caption + owner stats or reply bar */}
        <View style={styles.bottom}>
          {story.caption ? <Text style={styles.caption}>{story.caption}</Text> : null}

          {isOwner ? (
            <View style={styles.ownerRow}>
              <TouchableOpacity style={styles.viewsPill} onPress={() => setShowViewers(true)} activeOpacity={0.8}>
                {previewViewers.length > 0 && (
                  <View style={styles.viewerStack}>
                    {previewViewers.map((v, i) => (
                      <View key={v.userId} style={[styles.stackAvatarWrap, i > 0 && { marginLeft: -8 }]}>
                        {v.user?.avatar ? (
                          <Image source={{ uri: v.user.avatar }} style={styles.stackAvatar} />
                        ) : (
                          <View style={[styles.stackAvatar, styles.stackAvatarFallback]}>
                            <Text style={styles.stackAvatarLetter}>
                              {(v.user?.username || 'U').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
                <Feather name="eye" size={15} color="#fff" />
                <Text style={styles.viewsText}>
                  {uniqueViewerIds.length} view{uniqueViewerIds.length === 1 ? '' : 's'}
                </Text>
              </TouchableOpacity>
              {onDeleteStory && (
                <TouchableOpacity style={styles.deleteButton} onPress={() => setConfirmDelete(true)}>
                  <Feather name="trash-2" size={17} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View>
              <View style={styles.reactionsRow}>
                {QUICK_REACTIONS.map(emoji => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleSendReply(emoji)}
                    disabled={sending}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.replyBar}>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Type a response..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={replyText}
                  onChangeText={setReplyText}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  onSubmitEditing={() => handleSendReply(replyText)}
                  editable={!sending}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!replyText.trim() || sending) && { opacity: 0.4 }]}
                  onPress={() => handleSendReply(replyText)}
                  disabled={!replyText.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Feather name="send" size={16} color="#000" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Owner: viewers sheet */}
        <StoryViewersSheet
          visible={showViewers}
          story={story}
          onClose={() => setShowViewers(false)}
        />

        {/* Non-owner: report story */}
        <ReportModal
          isOpen={showReport}
          onClose={() => setShowReport(false)}
          targetId={story._id}
          targetType="story"
          targetName={`story by ${group.user.username}`}
        />

        {/* Owner: delete confirm */}
        <ConfirmModal
          isOpen={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
          title="Delete Story"
          message="Are you sure you want to delete this story? This cannot be undone."
          confirmText="Delete"
          type="danger"
          isLoading={deleting}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mediaContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  tapZoneLeft: {
    flex: 1,
  },
  tapZoneRight: {
    flex: 2,
  },
  progressRow: {
    position: 'absolute',
    top: 48,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  username: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  storyTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButton: {
    padding: 8,
  },
  flyingEmoji: {
    position: 'absolute',
    bottom: 150,
    left: '50%',
    zIndex: 40,
  },
  sentFlash: {
    position: 'absolute',
    top: '42%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 10,
    zIndex: 50,
  },
  sentFlashText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 12,
    gap: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  caption: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 21,
  },
  ownerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  viewsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  viewerStack: {
    flexDirection: 'row',
  },
  stackAvatarWrap: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 11,
  },
  stackAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  stackAvatarFallback: {
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stackAvatarLetter: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  viewsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 12,
  },
  reactionEmoji: {
    fontSize: 26,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 18,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 5,
    gap: 8,
  },
  replyInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 6,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
