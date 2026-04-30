'use client';

import { useEffect, useState } from 'react';

export interface AdminTicketRow {
  id: number;
  packId: string;
  packName: string;
  packEmoji: string;
  packPrice: number | null;
  index: number;
  grade: string | null;
  prizeName: string | null;
  prizeEmoji: string | null;
  prizeImageUrl: string | null;
  drawnAt: string | null; // ISO
  drawnById: string | null;
  drawnByName: string | null;
}

interface UserCounts {
  feedTotal: number;
  feedReports: number;
  tradeCount: number;
  ticketCount: number;
  sentMsg: number;
  recvMsg: number;
}

interface UserDetail {
  id: string;
  name: string;
  email: string | null;
  points: number;
  streakCount: number;
  lastCheckInAt: string | null;
  avatarId: string;
  backgroundId: string;
  frameId: string;
  ownedAvatars: string[];
  ownedBackgrounds: string[];
  ownedFrames: string[];
  createdAt: string;
  updatedAt: string;
  counts: UserCounts;
}

interface Props {
  initialItems: AdminTicketRow[];
  initialNextCursor: number | null;
  totalDrawn: number;
}

const GRADE_COLOR: Record<string, string> = {
  S: '#FF3B6B',
  A: '#FFD23F',
  B: '#3A5BD9',
  C: '#6B7280',
};

export function AdminOripaTicketList({ initialItems, initialNextCursor, totalDrawn }: Props) {
  const [items, setItems] = useState<AdminTicketRow[]>(initialItems);
  const [cursor, setCursor] = useState<number | null>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [popupUserId, setPopupUserId] = useState<string | null>(null);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/oripa-tickets?cursor=${cursor}&limit=30`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { items: AdminTicketRow[]; nextCursor: number | null };
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '로드 실패');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div style={{ padding: '0 var(--gap)' }}>
      <div
        style={{
          marginBottom: 10,
          fontFamily: 'var(--f1)',
          fontSize: 9,
          color: 'var(--ink2)',
          letterSpacing: 0.5,
        }}
      >
        뽑힌 티켓 총 {totalDrawn.toLocaleString()}개 · 최신순 · 사용자명 클릭 시 상세 팝업
      </div>

      {err && (
        <div
          style={{
            marginBottom: 10,
            padding: '8px 10px',
            background: 'var(--red)',
            color: 'var(--white)',
            fontFamily: 'var(--f1)',
            fontSize: 9,
            letterSpacing: 0.5,
            textAlign: 'center',
          }}
        >
          ⚠ {err}
        </div>
      )}

      {items.length === 0 && (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            fontFamily: 'var(--f1)',
            fontSize: 10,
            color: 'var(--ink3)',
            background: 'var(--white)',
            boxShadow:
              '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
          }}
        >
          아직 뽑힌 티켓이 없어요
        </div>
      )}

      {items.map((t) => (
        <div key={t.id} style={rowBoxStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ ...chipStyle, background: GRADE_COLOR[t.grade ?? 'C'] ?? 'var(--ink2)' }}>
                  {t.grade ?? '?'}
                </span>
                <span style={chipStyle}>#{t.index + 1}</span>
                <span style={{ ...chipStyle, background: 'var(--pap2)', color: 'var(--ink)' }}>
                  {t.packEmoji} {t.packName}
                  {t.packPrice ? ` · ${t.packPrice.toLocaleString()}P` : ''}
                </span>
              </div>
              <div style={{ marginTop: 6, fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--ink)' }}>
                {t.prizeEmoji ?? '🎁'} {t.prizeName ?? '(이름없음)'}
              </div>
              <div style={{ marginTop: 4, fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)' }}>
                {t.drawnAt ? new Date(t.drawnAt).toLocaleString('ko-KR', { hour12: false }) : '-'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              {t.drawnById ? (
                <button
                  type="button"
                  onClick={() => setPopupUserId(t.drawnById)}
                  style={userBtnStyle}
                  title="사용자 상세"
                >
                  👤 {t.drawnByName ?? '(이름없음)'}
                </button>
              ) : (
                <span style={{ ...userBtnStyle, opacity: 0.5, cursor: 'not-allowed' }}>(탈퇴/익명)</span>
              )}
            </div>
          </div>
        </div>
      ))}

      {cursor && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              padding: '10px 18px',
              fontFamily: 'var(--f1)',
              fontSize: 10,
              letterSpacing: 0.5,
              background: 'var(--ink)',
              color: 'var(--yel)',
              border: 'none',
              cursor: loadingMore ? 'default' : 'pointer',
              opacity: loadingMore ? 0.6 : 1,
            }}
          >
            {loadingMore ? '불러오는 중…' : '더 보기 ▼'}
          </button>
        </div>
      )}

      {popupUserId && (
        <UserPopup userId={popupUserId} onClose={() => setPopupUserId(null)} />
      )}
    </div>
  );
}

function UserPopup({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetch(`/api/admin/users/${encodeURIComponent(userId)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setUser(data.user as UserDetail);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : '사용자 조회 실패');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.6)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(380px, 100%)',
          maxHeight: '80vh',
          overflowY: 'auto',
          background: 'var(--white)',
          padding: 16,
          boxShadow:
            '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),5px 5px 0 var(--ink)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 11, fontWeight: 700, color: 'var(--ink)', letterSpacing: 0.5 }}>
            👤 사용자 상세
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{
              background: 'var(--ink)',
              color: 'var(--white)',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              fontFamily: 'var(--f1)',
              fontSize: 10,
            }}
          >
            ✕
          </button>
        </div>

        {loading && (
          <div style={{ padding: 20, textAlign: 'center', fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)' }}>
            불러오는 중…
          </div>
        )}
        {err && (
          <div
            style={{
              padding: 10,
              background: 'var(--red)',
              color: 'var(--white)',
              fontFamily: 'var(--f1)',
              fontSize: 9,
              textAlign: 'center',
            }}
          >
            ⚠ {err}
          </div>
        )}
        {user && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink)' }}>
            <Row k="이름" v={user.name} />
            <Row k="이메일" v={user.email ?? '-'} />
            <Row k="ID" v={user.id} mono />
            <Row k="포인트" v={`${user.points.toLocaleString()} P`} />
            <Row k="연속 출석" v={`${user.streakCount}일`} />
            <Row
              k="마지막 출석"
              v={user.lastCheckInAt ? new Date(user.lastCheckInAt).toLocaleString('ko-KR', { hour12: false }) : '-'}
            />
            <Row k="가입" v={new Date(user.createdAt).toLocaleString('ko-KR', { hour12: false })} />

            <SectionLabel>활동</SectionLabel>
            <Row k="피드 (전체)" v={`${user.counts.feedTotal}개`} />
            <Row k="혼잡도 제보" v={`${user.counts.feedReports}개`} />
            <Row k="거래글" v={`${user.counts.tradeCount}개`} />
            <Row k="오리파 뽑은 티켓" v={`${user.counts.ticketCount}장`} />
            <Row k="쪽지 보냄/받음" v={`${user.counts.sentMsg} / ${user.counts.recvMsg}`} />

            <SectionLabel>인벤토리</SectionLabel>
            <Row k="현재 아바타" v={user.avatarId} />
            <Row k="현재 배경" v={user.backgroundId} />
            <Row k="현재 프레임" v={user.frameId} />
            <Row k="보유 아바타" v={user.ownedAvatars.join(', ') || '-'} />
            <Row k="보유 배경" v={user.ownedBackgrounds.join(', ') || '-'} />
            <Row k="보유 프레임" v={user.ownedFrames.join(', ') || '-'} />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 6,
        paddingTop: 8,
        borderTop: '1px dashed rgba(0,0,0,.2)',
        fontSize: 9,
        color: 'var(--ink3)',
        letterSpacing: 0.5,
      }}
    >
      ▸ {children}
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
      <div style={{ minWidth: 96, color: 'var(--ink3)', fontSize: 9 }}>{k}</div>
      <div
        style={{
          flex: 1,
          fontFamily: mono ? 'monospace' : 'var(--f1)',
          fontSize: mono ? 9 : 10,
          wordBreak: 'break-all',
          color: 'var(--ink)',
        }}
      >
        {v}
      </div>
    </div>
  );
}

const rowBoxStyle: React.CSSProperties = {
  marginBottom: 8,
  padding: 10,
  background: 'var(--white)',
  boxShadow:
    '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
};

const chipStyle: React.CSSProperties = {
  fontFamily: 'var(--f1)',
  fontSize: 8,
  letterSpacing: 0.3,
  padding: '3px 6px',
  background: 'var(--ink)',
  color: 'var(--white)',
  lineHeight: 1,
};

const userBtnStyle: React.CSSProperties = {
  background: 'var(--blu)',
  color: 'var(--white)',
  border: 'none',
  padding: '6px 10px',
  fontFamily: 'var(--f1)',
  fontSize: 9,
  letterSpacing: 0.3,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
