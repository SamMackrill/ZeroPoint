import { X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import './toast.css';

/** An action offered in a toast, such as Undo after a scenario switch. */
export interface ToastAction {
  label: string;
  run(): void;
}

/** What to show in a toast. */
export interface ToastOptions {
  message: string;
  action?: ToastAction;
  /** Milliseconds before it closes on its own (default 5 s). */
  duration?: number;
}

interface ToastItem extends ToastOptions { id: number }

/** Show and dismiss toasts; see ToastProvider. */
export interface ToastApi {
  show(options: ToastOptions): number;
  dismiss(id: number): void;
}

export const TOAST_DURATION_MS = 5000;
/** Oldest toasts give way when more than this many are showing. */
export const MAX_TOASTS = 3;

const ToastContext = createContext<ToastApi | null>(null);

/** Access the toast API from inside a ToastProvider. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside a ToastProvider.');
  return api;
}

/** One toast: closes itself after its duration unless the pointer or focus is on it. */
function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss(id: number): void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [paused, toast, onDismiss]);
  return (
    <div className="toast" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <span className="toast-message">{toast.message}</span>
      {toast.action && (
        <button type="button" className="toast-action" onClick={() => { toast.action?.run(); onDismiss(toast.id); }}>{toast.action.label}</button>
      )}
      <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => onDismiss(toast.id)}><X size={13} aria-hidden="true"/></button>
    </div>
  );
}

/**
 * Status messages (docs/ui-redesign-plan.html §07): bottom-right, closing after 5 s, with an optional action. Replaces
 * Light and Electron's permanent status line and Medium's toast. Hovering or focusing a toast keeps it open.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setToasts(list => list.filter(toast => toast.id !== id)), []);
  const show = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    setToasts(list => [...list, { ...options, id }].slice(-MAX_TOASTS));
    return id;
  }, []);
  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map(toast => <ToastView key={toast.id} toast={toast} onDismiss={dismiss}/>)}
      </div>
    </ToastContext.Provider>
  );
}
