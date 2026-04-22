import { AppBar } from '@/components/ui/AppBar';
import { IconButton } from '@/components/ui/IconButton';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';

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
        <div className="p-avatar">🐣</div>
        <div>
          <div className="pf-name">트레이너_24</div>
          <div className="pf-meta">제보 12건 · 신뢰도 ★★★★☆</div>
        </div>
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
