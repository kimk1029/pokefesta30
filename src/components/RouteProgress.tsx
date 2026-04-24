'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * 클릭 즉시 상단에 가로 진행바를 띄우고, 라우트(pathname)가 바뀌면 사라짐.
 * Next 14 의 loading.tsx 는 Server Component 가 렌더되기 시작해야 보이는데,
 * 이 컴포넌트는 클릭 순간부터 바로 보이므로 "반응 없다가 넘어가는" 체감을 없앰.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  // pathname 변경 = 네비게이션 완료 → 감춤
  useEffect(() => {
    setShow(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const a = target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href) return;
      // 외부 링크 / 해시 / 새창 / 다운로드 등은 스킵
      if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      // 같은 경로면 스킵
      if (href === pathname) return;
      setShow(true);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [pathname]);

  if (!show) return null;
  return <div className="route-progress" aria-hidden />;
}
