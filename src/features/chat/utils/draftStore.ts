import AsyncStorage from '@react-native-async-storage/async-storage';

// Per-chat composer drafts, persisted locally and broadcast to any listener
// (namely the chat list, so it can show "Draft: ..." without polling storage).
type DraftListener = (chatId: string, text: string) => void;

const listeners = new Set<DraftListener>();

function draftStorageKey(chatId: string): string {
  return `chat-draft-${chatId}`;
}

export async function getDraft(chatId: string): Promise<string> {
  try {
    return (await AsyncStorage.getItem(draftStorageKey(chatId))) || '';
  } catch {
    return '';
  }
}

export async function setDraft(chatId: string, text: string): Promise<void> {
  const trimmed = text.trim();
  try {
    if (trimmed) {
      await AsyncStorage.setItem(draftStorageKey(chatId), text);
    } else {
      await AsyncStorage.removeItem(draftStorageKey(chatId));
    }
  } catch {
    // ignore storage errors
  }
  listeners.forEach(listener => listener(chatId, trimmed));
}

export function subscribeToDrafts(listener: DraftListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
