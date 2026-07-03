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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StoryGroup } from '../types';

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onViewed: (userId: string, storyId: string) => void;
}

const STORY_DURATION = 5000;

export const StoryViewer = ({ groups, initialGroupIndex, onClose, onViewed }: StoryViewerProps) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const group = groups[groupIndex];
  const story = group?.stories?.[storyIndex];

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
      setStoryIndex(prevGroup.stories.length - 1);
    }
  }, [storyIndex, groupIndex, groups]);

  useEffect(() => {
    if (!story) return;
    if (!story.viewed) {
      onViewed(group.user._id, story._id);
    }
  }, [story?._id]);

  useEffect(() => {
    if (paused) return;
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) goToNextStory();
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [storyIndex, groupIndex, paused]);

  if (!group || !story) return null;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Progress bars */}
        <View style={styles.progressRow}>
          {group.stories.map((_, idx) => (
            <View key={idx} style={styles.progressTrack}>
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
            <Text style={styles.username}>{group.user.username}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="x" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Media */}
        <View style={styles.mediaContainer}>
          {story.mediaType === 'image' ? (
            <Image source={{ uri: story.mediaUrl }} style={styles.media} resizeMode="contain" />
          ) : (
            <View style={styles.videoPlaceholder}>
              <Feather name="play-circle" size={64} color="#fff" />
              <Text style={styles.videoHint}>Video story</Text>
            </View>
          )}
          {story.caption ? (
            <View style={styles.captionBox}>
              <Text style={styles.captionText}>{story.caption}</Text>
            </View>
          ) : null}
        </View>

        {/* Tap zones for navigation */}
        <View style={styles.tapZones} pointerEvents="box-none">
          <Pressable style={styles.tapZoneLeft} onPress={goToPrevStory} />
          <Pressable
            style={styles.tapZoneRight}
            onPress={goToNextStory}
            onLongPress={() => setPaused(true)}
            onPressOut={() => setPaused(false)}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingTop: 54,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
    fontWeight: '600',
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  videoHint: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  captionBox: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  captionText: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 10,
    borderRadius: 10,
  },
  tapZones: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  tapZoneLeft: {
    flex: 1,
  },
  tapZoneRight: {
    flex: 2,
  },
});