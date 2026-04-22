'use client';

import { useRouter } from 'next/navigation';

export function BackButton({ href }: { href?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="appbar-back"
      aria-label="뒤로"
      onClick={() => (href ? router.push(href) : router.back())}
    >
      ◀
    </button>
  );
}
