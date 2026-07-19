import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StoryGroup } from '../types';
import { StoryRing } from './StoryRing';

interface StoryBarProps {
  currentUser: { _id: string; username: string; avatar?: string } | null;
  storyGroups: StoryGroup[];
  hasUnviewedStories: (group: StoryGroup) => boolean;
  onOpenComposer: () => void;
  onOpenGroup: (groupIndex: number) => void;
}

// Horizontal story row at the top of the chat list. Matches the web StoryBar:
// "My Stories" first (gradient ring when active, plus badge opens the camera
// composer), then contacts' stories with gradient/gray rings.
export const StoryBar = ({
  currentUser,
  storyGroups,
  hasUnviewedStories,
  onOpenComposer,
  onOpenGroup,
}: StoryBarProps) => {
  const myGroupIndex = storyGroups.findIndex(g => g.user._id === currentUser?._id);
  const myGroup = myGroupIndex >= 0 ? storyGroups[myGroupIndex] : undefined;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* My story: ring opens my stories (or the composer when empty) */}
        <View style={styles.storyItem}>
          <View>
            <StoryRing
              avatarUrl={currentUser?.avatar}
              username={currentUser?.username || '?'}
              hasStory
              hasUnviewedStory={!!myGroup}
              size="md"
              onPress={() => (myGroup ? onOpenGroup(myGroupIndex) : onOpenComposer())}
            />
            <TouchableOpacity style={styles.addBadge} onPress={onOpenComposer} activeOpacity={0.8}>
              <Feather name="plus" size={12} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.storyLabel} numberOfLines={1}>My Stories</Text>
        </View>

        {/* Other users' stories */}
        {storyGroups.map((group, index) => {
          if (group.user._id === currentUser?._id) return null;
          return (
            <View key={group.user._id} style={styles.storyItem}>
              <StoryRing
                avatarUrl={group.user.avatar}
                username={group.user.username}
                hasStory
                hasUnviewedStory={hasUnviewedStories(group)}
                size="md"
                onPress={() => onOpenGroup(index)}
                label={group.user.username}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1c1c1e',
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  storyItem: {
    alignItems: 'center',
  },
  addBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#09090b',
    zIndex: 2,
  },
  storyLabel: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    maxWidth: 76,
    textAlign: 'center',
  },
});
