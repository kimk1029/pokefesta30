import Link from 'next/link';
import { CongCompact } from '@/components/CongCompact';
import { ReportCard } from '@/components/ReportCard';
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
        <SectionTitle title="최근 제보" />
        {reports.length === 0 ? (
          <div className="trade-card">
            <div className="trade-title">아직 제보가 없어요. 첫 번째 제보를 남겨보세요!</div>
          </div>
        ) : (
          reports.map((r) => <ReportCard key={r.id} item={r} />)
        )}
      </div>

      <div className="bggap" />

      <Link href="/report" className="fab-btn">
        + 제보하기
      </Link>
    </>
  );
}
