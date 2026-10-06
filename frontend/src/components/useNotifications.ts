'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePolling } from './usePolling';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type AppNotification = { id: string; type: string; title: string; message: string; readAt: string | null; createdAt: string };

const authorization = () => ({ Authorization: `Bearer ${sessionStorage.getItem('auth_token') ?? ''}` });

// Notifications de l'utilisateur connecté, actualisées toutes les 30 secondes.
export function useNotifications(intervalMs = 30_000) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(() => {
    void fetch(`${apiUrl}/notifications`, { headers: authorization() })
      .then((response) => (response.ok ? (response.json() as Promise<{ items: AppNotification[]; unread: number }>) : null))
      .then((data) => { if (data) { setItems(data.items); setUnread(data.unread); } })
      .catch(() => undefined);
  }, []);

  useEffect(() => { load(); }, [load]);
  usePolling(load, intervalMs);

  const markRead = useCallback((id: string) => {
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => (item.id === id && !item.readAt ? { ...item, readAt: now } : item)));
    void fetch(`${apiUrl}/notifications/${id}/read`, { method: 'PATCH', headers: authorization() }).then(load).catch(() => undefined);
  }, [load]);

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => (item.readAt ? item : { ...item, readAt: now })));
    setUnread(0);
    void fetch(`${apiUrl}/notifications/read-all`, { method: 'POST', headers: authorization() }).then(load).catch(() => undefined);
  }, [load]);

  return { items, unread, markRead, markAllRead, reload: load };
}
