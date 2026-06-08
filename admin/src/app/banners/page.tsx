import { BannerManager, type BannerData } from '@/components/BannerManager';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let banners: BannerData[] = [];
  try {
    const rows = await prisma.heroBanner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    banners = rows.map((b) => ({
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
      linkUrl: b.linkUrl ?? null,
      active: b.active,
    }));
  } catch (e) {
    console.error('[admin.banners.page]', e);
  }

  return (
    <>
      <h1 className="admin-h1">히어로 배너</h1>
      <p className="admin-sub">
        홈 상단 배너 — 이미지/문구/연결 링크 관리. 비활성 배너는 홈에 노출되지 않습니다.
      </p>
      <BannerManager initialBanners={banners} />
    </>
  );
}
