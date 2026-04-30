import { AdminBannerList } from '@/components/admin/AdminBannerList';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminBannersPage() {
  const banners = await prisma.heroBanner.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });

  return (
    <>
      <StatusBar />
      <AppBar title="히어로 배너 관리" showBack backHref="/admin" />
      <div style={{ height: 14 }} />
      <AdminBannerList
        initialBanners={banners.map((b) => ({
          id: b.id,
          sortOrder: b.sortOrder,
          slideClass: b.slideClass,
          badge: b.badge,
          title: b.title,
          sub: b.sub,
          ctaHint: b.ctaHint,
          visualType: b.visualType,
          visualValue: b.visualValue,
          onClick: b.onClick,
          active: b.active,
        }))}
      />
      <div className="bggap" />
    </>
  );
}
