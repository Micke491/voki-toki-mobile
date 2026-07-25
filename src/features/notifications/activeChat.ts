let activeChatId: string | null = null;

export function setActiveChat(chatId: string | null): void {
  activeChatId = chatId;
}

export function getActiveChat(): string | null {
  return activeChatId;
}
