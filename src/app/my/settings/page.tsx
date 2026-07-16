import { AppBar } from '@/components/ui/AppBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import { CurrencySettingsItem } from '@/components/CurrencySettingsItem';
import { ThemeSettingsItem } from '@/components/ThemeSettingsItem';
import { ShowPortfolioSettingsItem } from '@/components/ShowPortfolioSettingsItem';
import { GameFilterSettingsItem } from '@/components/GameFilterSettingsItem';
import { NavStyleSettingsItem } from '@/components/NavStyleSettingsItem';

export const metadata = { title: '설정' };

/** 마이페이지 → 설정. 통화·테마·포트폴리오 표시·네비게이션 스타일을 한곳에서. */
export default function Page() {
  return (
    <>
      <StatusBar />
      <AppBar title="설정" showBack backHref="/my" />
      <div className="sect">
        <SectionTitle title="환경설정" />
        <CurrencySettingsItem />
        <ThemeSettingsItem />
        <ShowPortfolioSettingsItem />
        <NavStyleSettingsItem />
      </div>
      <div className="sect">
        <SectionTitle title="카드 게임 표시" />
        <GameFilterSettingsItem />
      </div>
      <div className="bggap" />
    </>
  );
}
