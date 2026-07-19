export interface BotAttachment {
  type: string;
  mimeType: string;
  fileName: string;
  thumbnailB64?: string;
}

/** Attachment payload sent to the server (base64 inline data). */
export interface OutgoingBotAttachment {
  mimeType: string;
  data: string;
  fileName: string;
}

/** A locally staged attachment before sending. */
export interface PendingBotAttachment {
  type: 'image' | 'video' | 'audio';
  mimeType: string;
  fileName: string;
  /** base64 without data-url prefix */
  data: string;
  /** local uri for preview */
  previewUri: string;
  sizeBytes: number;
  durationSec?: number;
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
