import { useCallback, useEffect, useRef, useState } from 'react';

export type NotificationTone = 'new' | 'success';

export interface AppNotification {
  id: number;
  title: string;
  detail?: string;
  tone: NotificationTone;
}

const AUTO_DISMISS_MS = 6000;
const MAX_VISIBLE = 3;

/**
 * In-app notification stack (no Web Notifications, no permission prompt).
 * Each entry disappears on its own; the timers are cleared on unmount.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Set<number>());

  const dismiss = useCallback((id: number) => {
    setNotifications(current => current.filter(notification => notification.id !== id));
  }, []);

  const notify = useCallback(
    (title: string, options: { detail?: string; tone?: NotificationTone } = {}) => {
      const id = nextId.current++;
      setNotifications(current => [
        ...current.slice(-(MAX_VISIBLE - 1)),
        { id, title, detail: options.detail, tone: options.tone ?? 'new' },
      ]);

      const timer = window.setTimeout(() => {
        timers.current.delete(timer);
        dismiss(id);
      }, AUTO_DISMISS_MS);
      timers.current.add(timer);
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      timers.current.forEach(window.clearTimeout);
      timers.current.clear();
    },
    [],
  );

  return { notifications, notify, dismiss };
}

const HIGHLIGHT_MS = 5000;

/** Ids to flash briefly in a list, so a cook or courier can spot what just changed. */
export function useHighlights() {
  const [ids, setIds] = useState<string[]>([]);
  const timers = useRef(new Set<number>());

  const highlight = useCallback((id: string) => {
    setIds(current => (current.includes(id) ? current : [...current, id]));
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      setIds(current => current.filter(value => value !== id));
    }, HIGHLIGHT_MS);
    timers.current.add(timer);
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach(window.clearTimeout);
      timers.current.clear();
    },
    [],
  );

  return { highlightedIds: ids, highlight };
}
