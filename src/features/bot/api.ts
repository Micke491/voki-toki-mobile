import { fetch as expoFetch } from 'expo/fetch';
import { apiClient, API_BASE_URL } from '../../api/client';
import { getToken } from '../../utils/storage';
import { BotChat, BotMessage, OutgoingBotAttachment } from './types';

export interface StreamCallbacks {
  /** Server acknowledged the user message (may carry server-built attachment thumbnail). */
  onInit?: (userMessage: BotMessage) => void;
  /** A piece of streamed bot text arrived. */
  onChunk?: (text: string) => void;
  /** Stream finished; final persisted bot message, (maybe) auto-generated title, and model name. */
  onDone?: (botMessage: BotMessage | null, chatTitle?: string, model?: string) => void;
}

export interface BotRateLimitError {
  kind: 'rate-limit';
  message: string;
  limitType: 'rpm' | 'rpd';
  retryAfter: number;
}

export interface BotRequestError {
  kind: 'error';
  message: string;
}

export type BotSendError = BotRateLimitError | BotRequestError;

export const botApi = {
  getChats: async (): Promise<{ chats: BotChat[] }> => {
    const response = await apiClient.get('/bot/chats');
    // The server returns a bare array.
    return { chats: Array.isArray(response.data) ? response.data : response.data?.chats || [] };
  },

  createChat: async (title?: string): Promise<BotChat> => {
    const response = await apiClient.post('/bot/chats', { title });
    return response.data;
  },

  getChat: async (id: string): Promise<BotChat> => {
    const response = await apiClient.get(`/bot/chats/${id}`);
    return response.data;
  },

  deleteChat: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/bot/chats/${id}`);
    return response.data;
  },

  renameChat: async (id: string, title: string): Promise<{ success: boolean; title: string }> => {
    const response = await apiClient.patch(`/bot/chats/${id}`, { title });
    return response.data;
  },

  pinChat: async (id: string, pinned?: boolean): Promise<{ success: boolean; pinned: boolean }> => {
    const response = await apiClient.patch(`/bot/chats/${id}/pin`, pinned === undefined ? {} : { pinned });
    return response.data;
  },

  /**
   * Sends a message and consumes the server's SSE stream
   * (`init` / `chunk` / `done` events — same protocol as the web app).
   * Throws a BotSendError on failure. Aborting via the signal is not an error.
   */
  sendMessageStream: async (
    chatId: string,
    payload: { text: string; attachments?: OutgoingBotAttachment[] },
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> => {
    const token = await getToken();

    let res;
    try {
      res = await expoFetch(`${API_BASE_URL}/bot/chats/${chatId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      throw { kind: 'error', message: 'Network error. Check your connection.' } as BotSendError;
    }

    if (!res.ok) {
      let errData: any = {};
      try {
        errData = await res.json();
      } catch {
        // non-JSON error body
      }
      if (res.status === 429 && errData?.retryAfter) {
        throw {
          kind: 'rate-limit',
          message: errData.error || 'Rate limit reached.',
          limitType: errData.limitType === 'rpd' ? 'rpd' : 'rpm',
          retryAfter: Number(errData.retryAfter) || 60,
        } as BotSendError;
      }
      throw {
        kind: 'error',
        message: errData?.error || 'The AI could not answer. Please try again.',
      } as BotSendError;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw { kind: 'error', message: 'Streaming is not supported on this device.' } as BotSendError;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let doneReceived = false;

    const processChunk = (chunk: string) => {
      if (!chunk.startsWith('data: ')) return;
      const dataStr = chunk.slice(6).trim();
      if (!dataStr) return;
      let data: any;
      try {
        data = JSON.parse(dataStr);
      } catch {
        return;
      }
      if (data.type === 'init' && data.userMessage) {
        callbacks.onInit?.(data.userMessage);
      } else if (data.type === 'chunk' && data.text) {
        callbacks.onChunk?.(data.text);
      } else if (data.type === 'done') {
        doneReceived = true;
        callbacks.onDone?.(data.botMessage || null, data.chatTitle, data.model);
      }
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          processChunk(chunk);
          boundary = buffer.indexOf('\n\n');
        }
      }
      // Flush any trailing event without a final blank line.
      if (buffer.trim()) processChunk(buffer.trim());
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) return;
      throw { kind: 'error', message: 'Connection lost while streaming.' } as BotSendError;
    }

    if (!doneReceived && !signal?.aborted) {
      // Stream ended without a done event (e.g. server hiccup) — surface as soft completion.
      callbacks.onDone?.(null, undefined);
    }
  },
};
