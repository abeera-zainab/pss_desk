import { create } from "zustand";
import type { NotificationDTO } from "@shared/types";
import { api } from "../lib/api";

interface NotificationState {
  items: NotificationDTO[];
  unread: number;
  load: () => Promise<void>;
  push: (n: NotificationDTO) => void;
  markRead: (id: string) => Promise<void>;
  reset: () => void;
}

export const useNotifications = create<NotificationState>((set, get) => ({
  items: [],
  unread: 0,

  load: async () => {
    const items = await api.getNotifications();
    set({ items, unread: items.filter((n) => !n.read).length });
  },

  // Called by the socket listener when a live notification arrives.
  push: (n) =>
    set((s) => ({ items: [n, ...s.items], unread: s.unread + (n.read ? 0 : 1) })),

  markRead: async (id) => {
    const target = get().items.find((n) => n.id === id);
    if (!target || target.read) return;
    await api.markNotificationRead(id);
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unread: Math.max(0, s.unread - 1)
    }));
  },

  reset: () => set({ items: [], unread: 0 })
}));
