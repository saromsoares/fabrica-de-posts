'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { invokeWithAuth } from '@/hooks/useAuthenticatedFunction';
import { Bell, X, Check, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import type { Notification } from '@/types/database';

const NOTIFICATION_ICONS: Record<string, string> = {
  follow_request: '🔔',
  follow_approved: '✅',
  follow_rejected: '❌',
  product_used: '📸',
  usage_limit_warning: '⚠️',
  welcome: '👋',
};

export default function NotificationBell() {
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    const { data } = await invokeWithAuth<{ unread_count: number }>('notifications', {
      action: 'unread_count',
    });
    if (data?.unread_count !== undefined) setUnreadCount(data.unread_count);
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const { data } = await invokeWithAuth<{ notifications: Notification[] }>('notifications', {
      action: 'list',
      limit: 15,
    });
    if (data?.notifications) setNotifications(data.notifications);
    setLoading(false);
  }, []);

  // Poll unread count every 30s — with session guard and cleanup
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await fetchUnreadCount();
    };

    run();
    const interval = setInterval(() => {
      if (!cancelled) run();
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchUnreadCount]);

  // Fetch full list when panel opens
  useEffect(() => {
    let cancelled = false;

    if (open && !cancelled) {
      fetchNotifications();
    }

    return () => {
      cancelled = true;
    };
  }, [open, fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const markRead = async (id: string) => {
    await invokeWithAuth('notifications', { action: 'mark_read', notification_id: id });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await invokeWithAuth('notifications', { action: 'mark_all_read' });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    await invokeWithAuth('notifications', { action: 'delete', notification_id: id });
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notif && !notif.read) setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-dark-400 hover:text-white hover:bg-dark-800/60 transition-all"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-800 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-dark-900 border border-dark-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-800">
            <h3 className="font-700 text-sm">Notificações</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
                >
                  <CheckCheck size={12} /> Marcar todas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-dark-500 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-dark-500" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell size={24} className="mx-auto text-dark-700 mb-2" />
                <p className="text-dark-500 text-sm">Nenhuma notificação.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors ${
                    !notif.read ? 'bg-brand-500/5' : ''
                  }`}
                >
                  <span className="text-lg mt-0.5 flex-shrink-0">
                    {NOTIFICATION_ICONS[notif.type] || '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notif.read ? 'font-700 text-white' : 'text-dark-300'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-dark-500 mt-0.5 line-clamp-2">{notif.body}</p>
                    <span className="text-[10px] text-dark-600 mt-1 block">{timeAgo(notif.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notif.read && (
                      <button
                        onClick={() => markRead(notif.id)}
                        className="p-1 text-dark-600 hover:text-brand-400 transition-colors"
                        title="Marcar como lida"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="p-1 text-dark-600 hover:text-red-400 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
