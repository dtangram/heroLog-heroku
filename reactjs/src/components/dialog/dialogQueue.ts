import { TOAST_DURATION } from '../../constants/dialog';

export type ConfirmTone = 'default' | 'danger';
export type ToastTone = 'success' | 'info';

interface DialogBase {
  id: number;
  title: string;
  message: string;
}

export interface AlertDialogItem extends DialogBase {
  kind: 'alert';
  buttonLabel: string;
  resolve: (value: boolean) => void;
}

export interface ConfirmDialogItem extends DialogBase {
  kind: 'confirm';
  confirmLabel: string;
  cancelLabel: string;
  tone: ConfirmTone;
  resolve: (value: boolean) => void;
}

export type DialogItem = AlertDialogItem | ConfirmDialogItem;

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface DialogState {
  /** Waiting popups; only the first one is shown, the rest wait their turn */
  dialogs: DialogItem[];
  toasts: ToastItem[];
}

let state: DialogState = { dialogs: [], toasts: [] };
let nextId = 1;
const listeners = new Set<() => void>();

const setState = (next: DialogState) => {
  state = next;
  listeners.forEach(listener => listener());
};

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getDialogState = () => state;

/** Closes a popup and passes the answer back to whoever opened it */
export const closeDialog = (id: number, answer: boolean) => {
  const dialog = state.dialogs.find(item => item.id === id);
  if (!dialog) return;
  setState({ ...state, dialogs: state.dialogs.filter(item => item.id !== id) });
  dialog.resolve(answer);
};

interface AlertOptions {
  title?: string;
  buttonLabel?: string;
}

/** A message the user must read before carrying on. Resolves when they close it. */
export const showAlert = (message: string, { title = 'Heads up', buttonLabel = 'OK' }: AlertOptions = {}) =>
  new Promise<void>(resolve => {
    const dialog: AlertDialogItem = {
      id: nextId++,
      kind: 'alert',
      title,
      message,
      buttonLabel,
      resolve: () => resolve(),
    };
    setState({ ...state, dialogs: [...state.dialogs, dialog] });
  });

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

/** Asks a yes/no question. Resolves true only if the user picks the confirm button. */
export const showConfirm = (
  message: string,
  { title = 'Are you sure?', confirmLabel = 'OK', cancelLabel = 'Cancel', tone = 'default' }: ConfirmOptions = {}
) =>
  new Promise<boolean>(resolve => {
    const dialog: ConfirmDialogItem = {
      id: nextId++,
      kind: 'confirm',
      title,
      message,
      confirmLabel,
      cancelLabel,
      tone,
      resolve,
    };
    setState({ ...state, dialogs: [...state.dialogs, dialog] });
  });

export const dismissToast = (id: number) => {
  if (!state.toasts.some(toast => toast.id === id)) return;
  setState({ ...state, toasts: state.toasts.filter(toast => toast.id !== id) });
};

/** A short note that doesn't need an answer, such as "Cover scanned". Closes itself. */
export const notify = (message: string, tone: ToastTone = 'success') => {
  const toast: ToastItem = { id: nextId++, message, tone };
  setState({ ...state, toasts: [...state.toasts, toast] });
  setTimeout(() => dismissToast(toast.id), TOAST_DURATION);
  return toast.id;
};

/** For tests: clears everything without answering */
export const resetDialogs = () => {
  setState({ dialogs: [], toasts: [] });
};