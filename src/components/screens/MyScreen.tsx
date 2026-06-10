import Link from 'next/link';
import { CurrencySettingsItem } from '@/components/CurrencySettingsItem';
import { EditableName } from '@/components/EditableName';
import { PointChipLive } from '@/components/LivePointsPill';
import { LogoutButton } from '@/components/LogoutButton';
import { MessagesInboxLink } from '@/components/MessagesInboxLink';
import { PortfolioTotal } from '@/components/PortfolioTotal';
import { ProfileAvatarClient } from '@/components/ProfileAvatarClient';
import { ShowPortfolioSettingsItem } from '@/components/ShowPortfolioSettingsItem';
import { ThemeSettingsItem } from '@/components/ThemeSettingsItem';
import { AppBar } from '@/components/ui/AppBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import type { LevelInfo } from '@/lib/level';

interface Props {
  user: { name?: string | null; email?: string | null };
  level: LevelInfo;
  cardCount: number;
  tradeCount: number;
  savedCount: number;
  /** 미로그인 게스트 모드. PortfolioTotal 안의 자체 오버레이가 보이도록 페이지
   *  구조는 그대로 두고, 의미 없는 UI(LogoutButton)만 숨긴다. */
  isGuest?: boolean;
  /** 어드민 계정(ADMIN_EMAILS) 이면 관리자 메뉴 노출. */
  isAdmin?: boolean;
}

const ACTIVITY: Array<{ em: string; bg: string; lb: string; href: string }> = [
  { em: '📈', bg: '#16A357', lb: '포트폴리오', href: '/my/portfolio' },
  { em: '🃏', bg: '#FB923C', lb: '내 카드', href: '/my/cards' },
  { em: '⭐', bg: '#7C3AED', lb: '관심카드', href: '/my/favorites' },
  { em: '📝', bg: '#FFD23F', lb: '내가 쓴 거래글', href: '/my/trades' },
  { em: '🗣', bg: '#6B3FA0', lb: '내 피드', href: '/my/feeds' },
  { em: '💛', bg: '#3A5BD9', lb: '찜한 글', href: '/my/bookmarks' },
];

const SHOP_SHORTCUTS = [
  { em: '🛒', bg: '#6B3FA0', lb: '포케30 상점', href: '/my/shop' },
  { em: '🎲', bg: '#1B2E89', lb: '오리파 · 뽑기', href: '/my/oripa' },
];

const SETTINGS: Array<{ em: string; bg: string; lb: string; href?: string }> = [
  { em: '📢', bg: '#FFD23F', lb: '공지사항', href: '/my/notices' },
  { em: '❓', bg: '#3A5BD9', lb: 'FAQ · 자주 묻는 질문', href: '/my/faq' },
  { em: '📜', bg: '#E8DFB8', lb: '이용약관', href: '/terms' },
  { em: '🔒', bg: '#0D7377', lb: '개인정보처리방침', href: '/privacy' },
  { em: '🔔', bg: '#E8DFB8', lb: '알림 설정 (준비중)' },
];

export function MyScreen({ user, level, cardCount, tradeCount, savedCount, isGuest, isAdmin }: Props) {
  const p = level;
  const xpPct = Math.max(0, Math.min(100, Math.round((p.xp / p.xpNeeded) * 100)));
  const name = user?.name ?? (isGuest ? '게스트' : '트레이너');

  return (
    <>
      <StatusBar />
      <AppBar
        title="내 프로필"
        right={
          <Link href="/my/shop" className="appbar-right" aria-label="상점">
            🛒
          </Link>
        }
      />

      {/* CardVault portfolio hero */}
      <div className="cv-profile-hero">
        <div className="cv-profile-top">
          <div className="cv-profile-avatar">
            <ProfileAvatarClient size={56} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cv-profile-name">
              <EditableName initialName={name} />
            </div>
            <div className="cv-profile-title">
              ★ LV.{p.level} {p.title}
            </div>
          </div>
          <Link
            href="/my/oripa"
            style={{
              padding: '6px 10px',
              background: 'rgba(255,255,255,.1)',
              color: 'var(--gold)',
              fontFamily: 'var(--f1)',
              fontSize: 10,
              letterSpacing: 0.5,
              textDecoration: 'none',
              boxShadow: '-2px 0 0 rgba(255,255,255,.2),2px 0 0 rgba(255,255,255,.2),0 -2px 0 rgba(255,255,255,.2),0 2px 0 rgba(255,255,255,.2)',
            }}
          >
            🎲
          </Link>
        </div>

        <div>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'rgba(255,255,255,.5)', letterSpacing: 0.5, marginBottom: 6 }}>
            XP {p.xp} / {p.xpNeeded}
          </div>
          <div
            style={{
              height: 10,
              background: 'rgba(0,0,0,.4)',
              boxShadow: 'inset 0 2px 0 rgba(0,0,0,.3),0 0 0 1px rgba(255,255,255,.1)',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: `${xpPct}%`,
                height: '100%',
                background: 'var(--gold)',
                boxShadow: 'inset 0 2px 0 var(--gold-lt),inset 0 -2px 0 var(--gold-dk)',
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <PointChipLive />
            <span style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'rgba(255,255,255,.5)', letterSpacing: 0.3 }}>
              다음 LV.까지 {p.xpNeeded - p.xp} XP
            </span>
          </div>
          <PortfolioTotal />
          {!isGuest && (
            <Link
              href="/my/portfolio"
              style={{
                display: 'block',
                marginTop: 8,
                textAlign: 'center',
                padding: '7px',
                background: 'rgba(0,0,0,.3)',
                color: 'var(--gold)',
                fontFamily: 'var(--f1)',
                fontSize: 10,
                letterSpacing: 0.4,
                textDecoration: 'none',
              }}
            >
              📈 포트폴리오 자세히 보기 →
            </Link>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="cv-stat-row">
        {/* 셋 다 동일한 플레인 숫자 — '내 카드'만 gold 뱃지(보더)였던 것 제거 */}
        <Stat n={cardCount} l="내 카드" />
        <Stat n={tradeCount} l="내 거래" />
        <Stat n={savedCount} l="찜한 글" />
      </div>

      {/* 내 활동 */}
      <div className="sect">
        <SectionTitle title="내 활동" />
        <MessagesInboxLink />
        {ACTIVITY.map((it) => (
          <Link key={it.lb} href={it.href} className="my-item">
            <div className="mi-icon" style={{ background: it.bg }}>
              {it.em}
            </div>
            <div className="mi-main">{it.lb}</div>
            <span className="mi-arr">▶</span>
          </Link>
        ))}
      </div>

      {/* 관리자 — 어드민 계정에만 노출. 히어로 배너/오리파 티켓 등 콘텐츠 관리. */}
      {isAdmin && (
        <div className="sect">
          <SectionTitle title="관리자" />
          <Link href="/admin" className="my-item">
            <div className="mi-icon" style={{ background: '#0F172A', color: 'var(--white)' }}>
              🛠
            </div>
            <div className="mi-main">어드민 · 콘텐츠 관리</div>
            <span className="mi-arr">▶</span>
          </Link>
        </div>
      )}

      {/* 상점 바로가기 */}
      <div className="sect">
        <SectionTitle title="상점 바로가기" />
        {SHOP_SHORTCUTS.map((it) => (
          <Link key={it.lb} href={it.href} className="my-item">
            <div className="mi-icon" style={{ background: it.bg }}>
              {it.em}
            </div>
            <div className="mi-main">{it.lb}</div>
            <span className="mi-arr">▶</span>
          </Link>
        ))}
      </div>

      {/* 설정 — 상점 바로가기와 동일 컨테이너 (좌우 gap 유지). */}
      <div className="sect">
        <SectionTitle title="설정" />
        <CurrencySettingsItem />
        <ThemeSettingsItem />
        <ShowPortfolioSettingsItem />
        {SETTINGS.map((it) =>
          it.href ? (
            <Link key={it.lb} href={it.href} className="my-item">
              <div className="mi-icon" style={{ background: it.bg }}>
                {it.em}
              </div>
              <div className="mi-main">{it.lb}</div>
              <span className="mi-arr">▶</span>
            </Link>
          ) : (
            <div key={it.lb} className="my-item" style={{ opacity: 0.5 }}>
              <div className="mi-icon" style={{ background: it.bg }}>
                {it.em}
              </div>
              <div className="mi-main">{it.lb}</div>
              <span className="mi-arr">▶</span>
            </div>
          ),
        )}
      </div>

      {!isGuest && (
        <div style={{ margin: '0 var(--gap) var(--cg)' }}>
          <LogoutButton />
        </div>
      )}
      <div className="bggap" />
    </>
  );
}

function Stat({ n, l, gold }: { n: number | string; l: string; gold?: boolean }) {
  return (
    <div className="cv-stat-card">
      <div className={`cv-stat-n${gold ? ' gold' : ''}`}>{n}</div>
      <div className="cv-stat-l">{l}</div>
    </div>
  );
}
