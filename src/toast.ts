export type ToastKind = 'success' | 'error' | 'info';
export type ToastMessage = { id: number; kind: ToastKind; message: string };

export function notify(message: string, kind: ToastKind = 'success') {
  window.dispatchEvent(new CustomEvent<ToastMessage>('siga:toast', { detail: { id: Date.now(), kind, message } }));
}
