import { AdminBannerList } from '@/components/admin/AdminBannerList';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { serverFetch } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';

interface BannerRow {
  id: number;
  sortOrder: number;
  slideClass: string;
  badge: string;
  title: string;
  sub: string;
  ctaHint: string | null;
  visualType: string;
  visualValue: string;
  onClick: string | null;
  active: boolean;
}

export default async function AdminBannersPage() {
  const r = await serverFetch<{ banners: BannerRow[] }>('/api/admin/banners');
  const banners = r.data?.banners ?? [];

  return (
    <>
      <StatusBar />
      <AppBar title="히어로 배너 관리" showBack backHref="/admin" />
      <div style={{ height: 14 }} />
      <AdminBannerList initialBanners={banners} />
      <div className="bggap" />
    </>
  );
}
