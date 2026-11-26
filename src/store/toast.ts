import { create } from 'zustand';
import { uid } from '@/lib/utils';

export type ToastKind = 'success' | 'error' | 'info' | 'xp';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  kind: ToastKind;
  action?: { label: string; onClick: () => void };
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = uid('toast');
    set({ toasts: [...get().toasts.slice(-3), { ...t, id }] });
    setTimeout(() => get().dismiss(id), t.action ? 6000 : 3800);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (title: string, description?: string) => useToasts.getState().push({ title, description, kind: 'success' }),
  error: (title: string, description?: string) => useToasts.getState().push({ title, description, kind: 'error' }),
  info: (title: string, description?: string, action?: Toast['action']) => useToasts.getState().push({ title, description, kind: 'info', action }),
  xp: (title: string, description?: string) => useToasts.getState().push({ title, description, kind: 'xp' }),
};
