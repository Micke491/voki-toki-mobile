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
}

export interface SearchUser {
  _id: string;
  username: string;
  name?: string;
  avatar?: string;
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
  readBy?: { userId: string; readAt: string }[];
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
