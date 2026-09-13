// Bus d'événements global pour les notifications (toasts). Sans dépendance React :
// utilisable depuis api.ts comme depuis les pages.

export type ToastKind = 'error' | 'success' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

type Listener = (items: ToastItem[]) => void;

let seq = 0;
let items: ToastItem[] = [];
const listeners = new Set<Listener>();

function publish() {
  for (const l of listeners) l(items);
}

function push(kind: ToastKind, message: string) {
  const item = { id: ++seq, kind, message };
  items = [...items, item];
  publish();
  const ttl = kind === 'error' ? 10_000 : 5_000;
  setTimeout(() => dismiss(item.id), ttl);
}

export function dismiss(id: number) {
  if (!items.some((i) => i.id === id)) return;
  items = items.filter((i) => i.id !== id);
  publish();
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  listener(items);
  return () => {
    listeners.delete(listener);
  };
}

export const toast = {
  error: (message: string) => push('error', message),
  success: (message: string) => push('success', message),
  info: (message: string) => push('info', message),
};
