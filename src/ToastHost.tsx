import { useEffect, useState } from 'react';
import type { ToastMessage } from './toast';
import { ThemeToggle } from './theme-toggle.tsx';

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  useEffect(() => {
    const onToast = (event: Event) => {
      const toast = (event as CustomEvent<ToastMessage>).detail;
      setToasts((current) => [...current, toast]);
      window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 4500);
    };
    window.addEventListener('siga:toast', onToast);
    return () => window.removeEventListener('siga:toast', onToast);
  }, []);
  return <><div className="global-theme-control"><ThemeToggle /></div><div className="toast-region" aria-live="polite" aria-atomic="true">{toasts.map((toast) => <div className={`toast toast-${toast.kind}`} key={toast.id} role={toast.kind === 'error' ? 'alert' : 'status'}><span aria-hidden="true">{toast.kind === 'success' ? '✓' : toast.kind === 'error' ? '!' : 'i'}</span>{toast.message}</div>)}</div></>;
}
