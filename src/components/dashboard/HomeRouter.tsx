'use client';

import { useTheme } from '@/components/ThemeProvider';
import { StatusBar } from '@/components/ui/StatusBar';
import { DashboardScreen, type SnkrdunkRow } from '@/components/dashboard/DashboardScreen';
import { CleanHome } from '@/components/dashboard/CleanHome';
import type { HeroSlideData } from '@/components/HeroSlider';
import type { MyCardWithPrice } from '@/lib/queries';

interface Props {
  cards: MyCardWithPrice[];
  heroBanners?: HeroSlideData[];
  isLoggedIn: boolean;
  snkrdunkRows?: SnkrdunkRow[];
  snkrdunkBoxRows?: SnkrdunkRow[];
}

/**
 * 메인화면 라우터 — 클린 테마는 프로토타입 레이아웃(CleanHome),
 * 그 외 테마는 기존 DashboardScreen. 훅 순서를 깨지 않도록 분기 컴포넌트로 분리.
 */
export function HomeRouter(props: Props) {
  const { theme } = useTheme();

  if (theme === 'clean') {
    return (
      <>
        <StatusBar />
        <CleanHome
          heroBanners={props.heroBanners}
          isLoggedIn={props.isLoggedIn}
          snkrdunkRows={props.snkrdunkRows}
          snkrdunkBoxRows={props.snkrdunkBoxRows}
        />
      </>
    );
  }

  return <DashboardScreen {...props} />;
}
