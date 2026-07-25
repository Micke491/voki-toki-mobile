export interface PushData {
  type?: 'message' | 'request' | 'call' | 'missed_call' | string;
  category?: string;
  chatId?: string;
  messageId?: string;
  senderId?: string;
  senderName?: string;
  callId?: string;
  callType?: string;
  callerId?: string;
  callerName?: string;
  tag?: string;
}

/** The tag the backend stacks a chat's message notifications under. */
export function chatNotificationTag(chatId: string): string {
  return `chat:${chatId}`;
}

/** The tag the backend stacks a chat's request notification under. */
export function requestNotificationTag(chatId: string): string {
  return `request:${chatId}`;
}

/** The tag the backend stacks a call's notification under. */
export function callNotificationTag(callId: string): string {
  return `call:${callId}`;
}
