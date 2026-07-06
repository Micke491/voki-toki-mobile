export interface BotAttachment {
  type: string;
  mimeType: string;
  fileName: string;
  thumbnailB64?: string;
}

export interface BotMessage {
  _id?: string;
  role: 'user' | 'model';
  text: string;
  attachments?: BotAttachment[];
  createdAt: string;
}

export interface BotChat {
  _id: string;
  userId: string;
  title: string;
  pinned: boolean;
  messages: BotMessage[];
  createdAt: string;
  updatedAt: string;
}
