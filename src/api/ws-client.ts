import { getToken } from '../utils/storage';
import { API_BASE_URL } from './client';

const WS_URL = API_BASE_URL.replace(/\/api$/, '').replace(/^http/, 'ws') + '/ws';

export class Channel {
  name: string;
  callbacks: Record<string, Function[]>;
  client: RealtimeClient;

  constructor(name: string, client: RealtimeClient) {
    this.name = name;
    this.client = client;
    this.callbacks = {};
  }

  bind(event: string, callback: Function) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  unbind(event: string, callback?: Function) {
    if (!this.callbacks[event]) return;
    if (callback) {
      this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
    } else {
      this.callbacks[event] = [];
    }
  }

  trigger(event: string, data: any) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(data));
    }
  }
}

export class RealtimeClient {
  ws: WebSocket | null = null;
  channels: Record<string, Channel> = {};
  reconnectAttempts = 0;
  maxReconnectAttempts = 10;
  reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;

  async connect() {
    if (this.isConnecting) return;
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;

    const token = await getToken();
    if (!token) return;

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(`${WS_URL}?token=${token}`);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;

        Object.keys(this.channels).forEach(channelName => {
          this.send({ action: 'subscribe', channel: channelName });
        });
      };

      this.ws.onmessage = (event: MessageEvent) => {
        const messages = (event.data as string).split('\n');
        for (const msgData of messages) {
          if (!msgData) continue;
          try {
            const message = JSON.parse(msgData);
            if (message.channel && message.event) {
              const channel = this.channels[message.channel];
              if (channel) {
                channel.trigger(message.event, message.data);
              }
            }
          } catch (err) {
            console.error('[WS] Failed to parse message', err);
          }
        }
      };

      this.ws.onclose = () => {
        console.log('[WS] Disconnected');
        this.ws = null;
        this.isConnecting = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[WS] Error', err);
        this.isConnecting = false;
      };
    } catch (err) {
      console.error('[WS] Connection failed', err);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WS] Max reconnect attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  subscribe(channelName: string): Channel {
    if (!this.channels[channelName]) {
      this.channels[channelName] = new Channel(channelName, this);
    }

    // Ensure we're connected
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.connect();
    }

    this.send({ action: 'subscribe', channel: channelName });

    return this.channels[channelName];
  }

  unsubscribe(channelName: string) {
    if (this.channels[channelName]) {
      delete this.channels[channelName];
      this.send({ action: 'unsubscribe', channel: channelName });
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; 
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.channels = {};
  }
}

export const wsClient = new RealtimeClient();
