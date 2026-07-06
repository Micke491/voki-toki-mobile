export interface UserLink {
  label: string;
  url: string;
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
  createdAt?: string;
}