import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useUiStore } from '../store/ui.store';

export const useWebSocket = () => {
  const user            = useAuthStore((state) => state.user);
  const addNotification = useUiStore((state) => state.addNotification);
  const wsRef           = useRef<WebSocket | null>(null);
  const retryRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount      = useRef(0);
  const MAX_RETRIES     = 5;

  useEffect(() => {
    if (!user) return;

    const connect = () => {
      // Clean up any existing connection
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }

      const ws = new WebSocket(`ws://localhost:8000/ws/${user.id}`);
      wsRef.current = ws;

      ws.onopen = () => {
        retryCount.current = 0; // reset on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'new_notification') {
            addNotification(message.data);
          }
        } catch {}
      };

      ws.onerror = () => {
        // Silently suppress — onclose will handle reconnect
      };

      ws.onclose = () => {
        if (retryCount.current >= MAX_RETRIES) return;
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delay = Math.min(1000 * 2 ** retryCount.current, 16000);
        retryCount.current += 1;
        retryRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
      }
    };
  }, [user, addNotification]);
};