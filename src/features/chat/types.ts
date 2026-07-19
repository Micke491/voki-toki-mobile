export interface ChatParticipant {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
}

export interface LastMessage {
  _id: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'gif' | 'sticker' | 'call';
  sender?: {
    _id: string;
    username: string;
  };
  createdAt: string;
  isSystemMessage?: boolean;
  storyId?: string;
  storyMediaUrl?: string;
  isDeletedForEveryone?: boolean;
}

export interface ChatListItem {
  _id: string;
  name?: string;
  isGroupChat?: boolean;
  avatar?: string;
  participants: ChatParticipant[];
  lastMessage?: LastMessage;
  updatedAt: string;
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
}

export interface SearchUser {
  _id: string;
  username: string;
  name?: string;
  avatar?: string;
}

export interface UserProfileLink {
  label?: string;
  url: string;
}

export interface UserProfile {
  _id: string;
  username: string;
  name?: string;
  bio?: string;
  avatar?: string;
  location?: string;
  gender?: string;
  links?: UserProfileLink[];
  createdAt?: string;
  activeStoriesCount?: number;
}

export interface BlockStatus {
  blocked: boolean;
  blockedByMe?: boolean;
  blockedByThem?: boolean;
}

export interface ListItem {
  type: 'header' | 'user';
  id: string;
  label?: string;
  user?: SearchUser;
}

export interface Message {
  _id: string;
  chatId: string;
  sender: ChatParticipant;
  text?: string;
  createdAt: string;
  updatedAt: string;
  status?: 'sending' | 'failed' | 'sent' | 'delivered' | 'seen';
  read?: boolean;
  isEdited?: boolean;
  isSystemMessage?: boolean;
  isDeletedForEveryone?: boolean;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'gif' | 'sticker' | 'call';
  mediaPublicId?: string;
  readBy?: { userId: string; readAt: string }[];
  deliveredTo?: string[];
  reactions?: {
    userId: string;
    emoji: string;
    createdAt: string;
    user?: {
      username: string;
      avatar?: string;
    };
  }[];
  replyTo?: Message;
  isPinned?: boolean;
  isForwarded?: boolean;
  storyId?: string;
  storyMediaUrl?: string;
  storyMediaType?: 'image' | 'video';
  storyCaption?: string;
  storyExpiresAt?: string;
  storyExpired?: boolean;
}

export interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface ChatDetails {
  _id: string;
  name?: string;
  isGroupChat?: boolean;
  avatar?: string;
  participants: ChatParticipant[];
  groupAdmin?: string;
}

export interface WallpaperPreset {
  name: string;
  /** Exact web CSS value stored on the account so wallpaper syncs across platforms. */
  value: string;
  /** Gradient stops rendered natively with expo-linear-gradient. */
  colors: [string, string, ...string[]];
}
