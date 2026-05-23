'use client';

import { useRouter } from 'next/navigation';
import { startRouteTransition } from '@/components/RouteProgress';

export function BackButton({ href }: { href?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="appbar-back"
      aria-label="뒤로"
      onClick={() => {
        startRouteTransition();
        if (href) router.push(href);
        else router.back();
      }}
    >
      ◀
    </button>
  );
}
