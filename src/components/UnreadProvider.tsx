'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const Ctx = createContext<{ count: number; refresh: () => Promise<void> } | null>(null);

const POLL_MS = 60_000;

export function UnreadProvider({
  initialCount,
  children,
}: {
  initialCount: number;
  children: ReactNode;
}) {
  const [count, setCount] = useState<number>(initialCount);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/messages/unread', { cache: 'no-store' });
      if (!r.ok) return;
      const data = (await r.json()) as { count: number };
      setCount(Number.isFinite(data.count) ? data.count : 0);
    } catch {
      /* ignore */
    }
  }, []);

  // 라우트 변경 시마다 체크
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  // 60초 폴링
  useEffect(() => {
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return <Ctx.Provider value={{ count, refresh }}>{children}</Ctx.Provider>;
}

export function useUnread() {
  const v = useContext(Ctx);
  if (!v) return { count: 0, refresh: async () => undefined };
  return v;
}
