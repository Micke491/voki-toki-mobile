import { PushData } from './types';

export interface InAppNotification {
  chatId?: string;
  title: string;
  body: string;
  data: PushData;
}

type Listener = (notification: InAppNotification) => void;

const listeners = new Set<Listener>();

export function emitInAppNotification(notification: InAppNotification): void {
  listeners.forEach(listener => listener(notification));
}

export function subscribeInApp(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
