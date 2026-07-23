export interface UserLink {
  label: string;
  url: string;
}

export type BotPersona = 'default' | 'coding' | 'coach' | 'sarcastic';

export interface NotificationPrefs {
  directMessages?: boolean;
  groupMessages?: boolean;
  calls?: boolean;
  chatRequests?: boolean;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  name?: string;
  bio?: string;
  location?: string;
  gender?: string;
  links?: UserLink[];
  readReceipts?: boolean;
  twoFactorEnabled?: boolean;
  theme?: string;
  defaultWallpaper?: string;
  autoPlayGifs?: boolean;
  autoPlayVoice?: boolean;
  storyPrivacy?: string;
  botPersona?: BotPersona;
  notificationPrefs?: NotificationPrefs;
  createdAt?: string;
}