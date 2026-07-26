export interface RestrictionEvent {
  restricted?: boolean;
  banned?: boolean;
  timeoutUntil?: string;
  message?: string;
}

type Listener = (event: RestrictionEvent) => void;

const listeners = new Set<Listener>();

export function emitRestriction(event: RestrictionEvent): void {
  listeners.forEach((listener) => listener(event));
}

export function subscribeRestriction(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
