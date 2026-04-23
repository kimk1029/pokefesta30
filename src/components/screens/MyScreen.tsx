import Link from 'next/link';
import { AppBar } from '@/components/ui/AppBar';
import { IconButton } from '@/components/ui/IconButton';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import { MY_PROFILE } from '@/lib/data';

const STATS = [
  { n: '12', l: '내 제보' },
  { n: '3', l: '내 거래' },
  { n: '7', l: '찜한 글' },
];

const ACTIVITY: Array<{ em: string; bg: string; lb: string }> = [
  { em: '📝', bg: '#FFD23F', lb: '내가 쓴 거래글' },
  { em: '📢', bg: '#FB923C', lb: '내가 올린 제보' },
  { em: '🗣', bg: '#6B3FA0', lb: '내 피드' },
  { em: '💛', bg: '#3A5BD9', lb: '찜한 글' },
];

export function MyScreen() {
  const p = MY_PROFILE;

  return (
    <>
      <StatusBar />
      <AppBar
        title="마이페이지"
        right={
          <IconButton aria-label="설정">
            ⚙
          </IconButton>
        }
      />

      <div className="profile-card">
        <div className="p-avatar">{p.avatar}</div>
        <div>
          <div className="pf-name">{p.name}</div>
          <div className="pf-meta">제보 {p.reportCount}건 · 신뢰도 {p.rating}</div>
        </div>
      </div>

      <div className="points-card">
        <div>
          <div className="pt-label">보유 포인트</div>
          <div className="pt-amount">💎 {p.points.toLocaleString()} P</div>
        </div>
        <Link href="/my/shop" className="pt-cta">
          충전 ▶
        </Link>
      </div>

      <div className="my-features">
        <Link href="/my/shop" className="my-feat shop">
          <div className="mf-icon">🛒</div>
          <div>
            <div className="mf-name">상점</div>
            <div className="mf-desc">포인트로 구매</div>
          </div>
        </Link>
        <Link href="/my/oripa" className="my-feat oripa">
          <div className="mf-icon">🎁</div>
          <div>
            <div className="mf-name">오리파</div>
            <div className="mf-desc">랜덤 뽑기</div>
          </div>
        </Link>
      </div>

      <div className="stat-row">
        {STATS.map((s) => (
          <div key={s.l} className="stat-card">
            <div className="stat-n">{s.n}</div>
            <div className="stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="sect">
        <SectionTitle title="내 활동" />
        {ACTIVITY.map((it) => (
          <div key={it.lb} className="my-item">
            <div className="mi-icon" style={{ background: it.bg }}>
              {it.em}
            </div>
            <div className="mi-main">{it.lb}</div>
            <span className="mi-arr">▶</span>
          </div>
        ))}
      </div>

      <div className="bggap" />
    </>
  );
}
