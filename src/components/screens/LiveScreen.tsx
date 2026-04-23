import Link from 'next/link';
import { CongCompact } from '@/components/CongCompact';
import { AppBar } from '@/components/ui/AppBar';
import { LivePill } from '@/components/ui/LivePill';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import type { FeedItem, Place } from '@/lib/types';

interface Props {
  places: Place[];
  reports: FeedItem[];
}

export function LiveScreen({ places, reports }: Props) {
  // 레벨 카운트만 집계 — 리스트는 보여주지 않음 (피드와 중복 방지)
  const tally = reports.reduce(
    (acc, r) => {
      acc[r.level] = (acc[r.level] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <>
      <StatusBar />
      <AppBar title="실시간 현황" right={<LivePill />} />

      <div className="sect" style={{ marginTop: 14 }}>
        <SectionTitle
          title="장소별 혼잡도"
          right={<span className="more">{places.length}곳</span>}
        />
        <CongCompact places={places} />
      </div>

      <div className="sect">
        <SectionTitle title="오늘 제보 요약" right={<LivePill label={`${reports.length}건`} />} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4,1fr)',
            gap: 6,
            marginBottom: 10,
          }}
        >
          {([
            ['empty',  '여유',     'var(--c-e)', 'var(--ink)'],
            ['normal', '보통',     'var(--c-n)', 'var(--ink)'],
            ['busy',   '혼잡',     'var(--c-b)', 'var(--white)'],
            ['full',   '매우혼잡', 'var(--c-f)', 'var(--white)'],
          ] as const).map(([k, label, bg, color]) => (
            <div
              key={k}
              style={{
                padding: '10px 6px',
                background: bg,
                color,
                textAlign: 'center',
                fontFamily: 'var(--f1)',
                lineHeight: 1.5,
                boxShadow:
                  '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
              }}
            >
              <div style={{ fontSize: 14, marginBottom: 4 }}>{tally[k] ?? 0}</div>
              <div style={{ fontSize: 8, letterSpacing: 0.3 }}>{label}</div>
            </div>
          ))}
        </div>
        <Link
          href="/feed?kind=report"
          className="map-btn pri"
          style={{ textAlign: 'center', textDecoration: 'none' }}
        >
          📢 제보 타임라인 전체 보기 ▶
        </Link>
      </div>

      <div className="bggap" />

      <Link href="/write/feed?kind=report" className="fab-btn">
        + 제보하기
      </Link>
    </>
  );
}
