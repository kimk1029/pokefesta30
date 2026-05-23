'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * 라우트 전환 즉각 피드백.
 *
 * 1. 상단 가로 진행바
 * 2. 전체화면 반투명 오버레이 + 포켓볼 스피너
 *
 * 트리거:
 * - 같은 origin 의 <a> 클릭 (Next <Link> 포함)
 * - popstate (브라우저 뒤로/앞으로)
 * - `window.dispatchEvent(new Event('pf:nav-start'))` — router.push 같은
 *   programmatic 네비게이션에서 즉시 오버레이를 띄울 때 사용
 *
 * 해제: pathname 또는 search params 가 바뀌면 자동 해제.
 *
 * 디자인 의도: loading.tsx 는 Next 가 새 라우트 트리를 마운트하기 시작해야
 * 보이는데, 그 사이 (몇백 ms) 동안 사용자가 클릭에 무반응이라고 느껴서
 * "느려보인다" 는 인상이 생긴다. 클릭 즉시 화면을 덮어 그 빈 시간을 메운다.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [show, setShow] = useState(false);

  // 경로 변경 = 새 페이지가 실제로 마운트됨 → 오버레이 해제
  useEffect(() => {
    setShow(false);
  }, [pathname, search]);

  useEffect(() => {
    const start = () => setShow(true);

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const a = target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href) return;
      // 외부 / 해시 / 새창 / 다운로드 / 보조 클릭은 스킵
      if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      // 같은 경로(쿼리까지)면 스킵
      const here = pathname + (search?.toString() ? `?${search.toString()}` : '');
      if (href === here) return;
      start();
    };
    const onPop = () => start();

    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onPop);
    window.addEventListener('pf:nav-start', start);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('pf:nav-start', start);
    };
  }, [pathname, search]);

  if (!show) return null;
  return (
    <>
      <div className="route-progress" aria-hidden />
      <div className="route-overlay" role="status" aria-live="polite" aria-label="페이지 로딩 중">
        <div
          className="pf-pokeball-spinner"
          style={{ width: 56, height: 56 }}
          aria-hidden
        />
      </div>
    </>
  );
}

/** programmatic 네비게이션 (router.push 등) 직전에 호출. */
export function startRouteTransition() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('pf:nav-start'));
}
