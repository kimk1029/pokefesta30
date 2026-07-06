import { Router, type Request, type Response } from 'express';
import {
  fetchSnkrdunkBrowse,
  fetchSnkrdunkSearch,
  fetchSnkrdunkApparel,
  fetchSnkrdunkSalesHistory,
  fetchSnkrdunkSalesChart,
  fetchSnkrdunkApparelGroup,
} from '@/lib/snkrdunk';
import {
  recordPriceSnapshot,
  upsertCatalogCard,
  upsertSearchResults,
} from '../lib/snkrdunkCatalog.js';
import { getCachedCardImageUrl } from '../lib/cardImageCache.js';
import { computeApparelPrices } from '@/lib/snkrdunkPrice';

const router = Router();

router.get('/browse', async (req: Request, res: Response) => {
  const pageRaw = Number(req.query.page ?? 1);
  const page = Math.max(1, Math.min(50, Number.isFinite(pageRaw) ? pageRaw : 1));
  const results = await fetchSnkrdunkBrowse(page);
  res.json({ page, results });
  // 목록에 노출된 카드의 정적 정보도 카탈로그에 적재 (검색과 동일, 응답 후 실패 무시).
  void upsertSearchResults(results);
});

router.get('/search', async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const pageRaw = Number(req.query.page ?? 1);
  const page = Math.max(1, Math.min(50, Number.isFinite(pageRaw) ? pageRaw : 1));
  if (!q) return res.json({ page, results: [], hasMore: false });
  const results = await fetchSnkrdunkSearch(q, page);
  // 스니덩 SSR은 페이지당 결과 수가 일정치 않다(보통 <40). 결과가 하나라도 있으면
  // 다음 페이지를 시도하게 두고, 클라이언트가 "새 항목 0개"면 멈춘다.
  res.json({ page, results, hasMore: results.length > 0 });
  // 검색에 노출된 카드의 정적 정보를 카탈로그에 적재 (응답 후, 실패 무시).
  void upsertSearchResults(results);
});

function parseApparelId(raw: unknown, res: Response): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'invalid apparel id' });
    return null;
  }
  return id;
}

router.get('/apparels/:id', async (req: Request, res: Response) => {
  const apparelId = parseApparelId(req.params.id, res);
  if (apparelId === null) return;
  const data = await fetchSnkrdunkApparel(apparelId);
  if (!data) {
    return res
      .status(502)
      .json({ data: null, reason: 'SNKRDUNK 상품 정보를 가져오지 못했습니다.' });
  }
  // 이미 캐싱된 자체 CDN 이미지가 있으면 응답에 실어 보낸다(없으면 null → 원본 폴백).
  const cdnImageUrl = await getCachedCardImageUrl(apparelId);
  res.json({ data: { ...data, cdnImageUrl } });
  // 조회된 카드의 정적 정보를 우리 DB 에 적재 (응답 후, 실패 무시).
  // upsertCatalogCard 내부에서 첫 조회 시 원본→webp 캐싱도 트리거된다.
  void upsertCatalogCard(data);
  // 최신가 수집 — 싱글(raw 중앙값)/PSA10/추이까지 계산해 풀 스냅샷으로 기록.
  // (응답 후 백그라운드. 거래이력·차트 추가 조회는 사용자 응답 지연 없음.)
  void (async () => {
    try {
      const [hist, chart] = await Promise.all([
        fetchSnkrdunkSalesHistory(apparelId).catch(() => null),
        fetchSnkrdunkSalesChart(apparelId).catch(() => null),
      ]);
      const prices = computeApparelPrices(
        hist?.history ?? [],
        chart?.points ?? [],
        data.minPrice ?? 0,
      );
      if (data.minPrice > 0 || prices.single > 0 || prices.psa10 > 0) {
        await recordPriceSnapshot(apparelId, {
          minPrice: data.minPrice,
          listingCount: data.listingCount,
          priceSingle: prices.single,
          pricePsa10: prices.psa10,
          trend: prices.trendJpy,
        });
      }
    } catch (err) {
      console.error('[snkrdunk.fullsnapshot]', apparelId, err);
    }
  })();
});

router.get('/apparels/:id/sales-history', async (req: Request, res: Response) => {
  const apparelId = parseApparelId(req.params.id, res);
  if (apparelId === null) return;
  const data = await fetchSnkrdunkSalesHistory(apparelId);
  if (!data) {
    return res
      .status(502)
      .json({ data: null, reason: 'SNKRDUNK 거래 이력을 가져오지 못했습니다.' });
  }
  res.json({ data });
});

router.get('/apparel-groups/:groupId', async (req: Request, res: Response) => {
  const groupId = Number(req.params.groupId);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return res.status(400).json({ error: 'invalid groupId' });
  }
  const catRaw = Number(req.query.apparelCategoryId);
  // snkrdunk lib is typed as 25 | 14. Only honor those values.
  const apparelCategoryId: 14 | 25 | undefined =
    catRaw === 14 ? 14 : catRaw === 25 ? 25 : undefined;
  const pageRaw = Number(req.query.page ?? 1);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const perPageRaw = Number(req.query.perPage ?? 24);
  const perPage = Math.max(1, Math.min(50, Number.isFinite(perPageRaw) ? perPageRaw : 24));
  try {
    const data = await fetchSnkrdunkApparelGroup(groupId, {
      apparelCategoryId,
      page,
      perPage,
    });
    if (!data) return res.json({ data: null });
    res.json({ data });
  } catch (err) {
    console.error('[snkrdunk.apparel-group]', err);
    res.status(500).json({ data: null, error: 'internal' });
  }
});

router.get('/apparels/:id/sales-chart', async (req: Request, res: Response) => {
  const apparelId = parseApparelId(req.params.id, res);
  if (apparelId === null) return;
  const data = await fetchSnkrdunkSalesChart(apparelId);
  if (!data) {
    return res
      .status(502)
      .json({ data: null, reason: 'SNKRDUNK 시세 차트를 가져오지 못했습니다.' });
  }
  res.json({ data });
});

export default router;
