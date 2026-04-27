'use client';

import { useSession } from 'next-auth/react';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const Ctx = createContext<{ count: number; refresh: () => Promise<void> } | null>(null);

const POLL_MS = 60_000;

export function UnreadProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { status } = useSession();
  const isLoggedIn = status === 'authenticated';
  const [count, setCount] = useState<number>(0);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setCount(0);
      return;
    }
    try {
      const r = await fetch('/api/messages/unread', { cache: 'no-store' });
      if (!r.ok) return;
      const data = (await r.json()) as { count: number };
      setCount(Number.isFinite(data.count) ? data.count : 0);
    } catch {
      /* ignore */
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [isLoggedIn, refresh]);

  return <Ctx.Provider value={{ count, refresh }}>{children}</Ctx.Provider>;
}

export function useUnread() {
  const v = useContext(Ctx);
  if (!v) return { count: 0, refresh: async () => undefined };
  return v;
}
