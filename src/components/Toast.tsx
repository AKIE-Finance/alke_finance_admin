import { useEffect, useState } from 'react';
import { dismiss, subscribe, type ToastItem } from '../toast';
import { IconButton } from './Button';

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribe(setItems), []);
  return (
    <div className="toast-host" role="region" aria-label="Notifications" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
          <span className="toast-message">{t.message}</span>
          <IconButton icon="close" size={14} label="Fermer la notification" onClick={() => dismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}
