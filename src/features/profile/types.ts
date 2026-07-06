import { User, UserLink } from '../../types';

export interface ProfileData {
  user: User & {
    bio?: string;
    location?: string;
    gender?: string;
    links?: UserLink[];
    readReceipts?: boolean;
    twoFactorEnabled?: boolean;
    theme?: string;
    createdAt?: string;
  };
  stories: any[];
}

export interface UpdateProfilePayload {
  username?: string;
  name?: string;
  bio?: string;
  avatar?: string;
  location?: string | null;
  gender?: string | null;
  links?: UserLink[];
}
