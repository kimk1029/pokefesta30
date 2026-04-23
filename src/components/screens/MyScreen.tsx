import Link from 'next/link';
import type { Session } from 'next-auth';
import { LogoutButton } from '@/components/LogoutButton';
import { PixelBulbasaur } from '@/components/PixelBulbasaur';
import { PixelCharmander } from '@/components/PixelCharmander';
import { PixelSquirtle } from '@/components/PixelSquirtle';
import { AppBar } from '@/components/ui/AppBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import { MY_PROFILE } from '@/lib/data';
import type { StarterId } from '@/lib/types';

interface Props {
  session: Session;
}

const STATS: Array<[string, string]> = [
  [String(MY_PROFILE.reportCount), '내 제보'],
  [String(MY_PROFILE.tradeCount), '내 거래'],
  [String(MY_PROFILE.savedCount), '찜한 글'],
];

const ACTIVITY: Array<{ em: string; bg: string; lb: string; href: string }> = [
  { em: '📝', bg: '#FFD23F', lb: '내가 쓴 거래글', href: '/my/trades' },
  { em: '📢', bg: '#FB923C', lb: '내가 올린 제보', href: '/my/reports' },
  { em: '🗣', bg: '#6B3FA0', lb: '내 피드', href: '/my/feeds' },
  { em: '💛', bg: '#3A5BD9', lb: '찜한 글', href: '/my/bookmarks' },
];

const SHOP_SHORTCUTS = [
  { em: '🛒', bg: '#6B3FA0', lb: '포케30 상점', href: '/my/shop' },
  { em: '🎲', bg: '#1B2E89', lb: '오리파 · 뽑기', href: '/my/oripa' },
];

const SETTINGS: Array<{ em: string; bg: string; lb: string }> = [
  { em: '🔔', bg: '#E8DFB8', lb: '알림 설정' },
  { em: 'ℹ', bg: '#E8DFB8', lb: '공지사항 · FAQ' },
];

function StarterAvatar({ starter }: { starter: StarterId }) {
  const size = 44;
  if (starter === 'charmander') return <PixelCharmander size={size} />;
  if (starter === 'squirtle') return <PixelSquirtle size={size} />;
  return <PixelBulbasaur size={size} />;
}

export function MyScreen({ session }: Props) {
  const p = MY_PROFILE;
  const xpPct = Math.max(0, Math.min(100, Math.round((p.xp / p.xpNeeded) * 100)));
  const name = session.user?.name ?? p.name;

  return (
    <>
      <StatusBar />
      <AppBar
        title="마이페이지"
        right={
          <Link href="/my/shop" className="appbar-right" aria-label="상점">
            🛒
          </Link>
        }
      />

      {/* Level card */}
      <div className="level-card">
        <div className="level-top">
          <div className="lv-avatar">
            <StarterAvatar starter={p.starter} />
          </div>
          <div className="lv-info">
            <div className="lv-name">{name}</div>
            <div className="lv-badge">
              ⭐ LV.{p.level} {p.title}
            </div>
            <div className="lv-sub">다음 레벨까지 {p.xpNeeded - p.xp} XP 남음</div>
          </div>
        </div>

        <div>
          <div className="xp-wrap">
            <div className="xp-bar-bg">
              <div className="xp-bar-fill" style={{ width: `${xpPct}%` }} />
            </div>
          </div>
          <div className="xp-label">
            <span>
              XP {p.xp} / {p.xpNeeded}
            </span>
            <span>
              LV.{p.level} → LV.{p.level + 1}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="point-chip">🪙 {p.points.toLocaleString()} 포인트</div>
          <Link href="/my/oripa" className="lv-draw-btn">
            🎲 뽑기
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-row">
        {STATS.map(([n, l]) => (
          <div key={l} className="stat-card">
            <div className="stat-n">{n}</div>
            <div className="stat-l">{l}</div>
          </div>
        ))}
      </div>

      {/* 내 활동 */}
      <div className="sect">
        <SectionTitle title="내 활동" />
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

      {/* 설정 */}
      <div className="sect">
        <SectionTitle title="설정" />
        {SETTINGS.map((it) => (
          <div key={it.lb} className="my-item">
            <div className="mi-icon" style={{ background: it.bg }}>
              {it.em}
            </div>
            <div className="mi-main">{it.lb}</div>
            <span className="mi-arr">▶</span>
          </div>
        ))}
      </div>

      <div style={{ margin: '0 var(--gap) var(--cg)' }}>
        <LogoutButton />
      </div>
      <div className="bggap" />
    </>
  );
}
