import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { authOptions } from '@/lib/auth';
import { getMyReports } from '@/lib/queries';

const LEVEL_LABEL: Record<string, string> = {
  empty: '한산',
  normal: '보통',
  busy: '혼잡',
  full: '매우 혼잡',
};

const LEVEL_COLOR: Record<string, string> = {
  empty: '#22c55e',
  normal: '#facc15',
  busy: '#f97316',
  full: '#ef4444',
};

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/my');

  const reports = await getMyReports(session.user.id);

  return (
    <>
      <StatusBar />
      <AppBar title="내가 올린 제보" showBack backHref="/my" />
      <div className="sect">
        {reports.length === 0 ? (
          <div className="feed-item">
            <div className="fi-body">
              <div className="fi-text">아직 작성한 제보가 없어요</div>
            </div>
          </div>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="feed-item">
              <div className="fi-avatar">{r.user}</div>
              <div className="fi-body">
                <div className="fi-top">
                  <span className="tag tag-place" style={{ fontSize: 10, padding: '2px 6px' }}>
                    📍 {r.place}
                  </span>
                  <span
                    className="tag"
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      background: LEVEL_COLOR[r.level] ?? '#aaa',
                      color: '#fff',
                    }}
                  >
                    {LEVEL_LABEL[r.level] ?? r.level}
                  </span>
                  <span className="fi-time">{r.time}</span>
                </div>
                {r.text && <div className="fi-text">{r.text}</div>}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="bggap" />
    </>
  );
}
