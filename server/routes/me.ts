import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { defaultNameFor } from '../lib/defaultName.js';
import {
  pickAvatar,
  pickBackground,
  pickFrame,
  buyAvatar,
  buyBackground,
  buyFrame,
} from '../lib/inventoryOps.js';
import { findCardEntry } from '@/lib/cardsCatalog';
import { levelFromPoints } from '@/lib/level';
import {
  countMyCards,
  getMyBookmarks,
  getMyCardsWithPrices,
  getMyFavoritesWithPrices,
  getMyFeeds,
  getMyInventory,
  getMyTrades,
} from '../lib/queries.js';
import { fetchSnkrdunkApparel, fetchSnkrdunkSalesHistory, fetchSnkrdunkSalesChart } from '@/lib/snkrdunk';
import { runDailyCheckIn } from '../lib/checkIn.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    const [inv, profile, tradeCount, savedCount, cardCount] = await Promise.all([
      getMyInventory(userId),
      prisma.user
        .findUnique({ where: { id: userId }, select: { name: true, email: true } })
        .catch(() => null),
      prisma.trade.count({ where: { authorId: userId } }).catch(() => 0),
      prisma.bookmark.count({ where: { userId } }).catch(() => 0),
      countMyCards(userId),
    ]);
    res.json({
      user: {
        id: userId,
        name: profile?.name ?? req.user!.name ?? null,
        email: profile?.email ?? req.user!.email ?? null,
      },
      inventory: inv,
      level: levelFromPoints(inv.points),
      counts: { tradeCount, savedCount, cardCount },
    });
  } catch (err) {
    console.error('[me.summary]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.get('/cards', async (req: Request, res: Response) => {
  try {
    const rows = await prisma.userCard.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ data: rows });
  } catch (err) {
    console.error('[me.cards.GET]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.post('/cards', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const body = (req.body ?? {}) as Record<string, unknown>;

  const cardIdRaw = typeof body.cardId === 'string' ? body.cardId.trim() : '';
  const cardId = cardIdRaw && findCardEntry(cardIdRaw) ? cardIdRaw : null;
  const ocrSetCode = typeof body.ocrSetCode === 'string' ? body.ocrSetCode.trim().slice(0, 16) : null;
  const ocrCardNumber =
    typeof body.ocrCardNumber === 'string' ? body.ocrCardNumber.trim().slice(0, 16) : null;
  const snkrdunkApparelId =
    typeof body.snkrdunkApparelId === 'number' && Number.isInteger(body.snkrdunkApparelId)
      ? body.snkrdunkApparelId
      : null;

  if (!cardId && !ocrSetCode && !ocrCardNumber && !snkrdunkApparelId) {
    return res
      .status(400)
      .json({ error: 'cardId, OCR 식별자, snkrdunkApparelId 중 하나는 필요해요' });
  }

  const nickname = typeof body.nickname === 'string' ? body.nickname.trim().slice(0, 60) : null;
  const memo = typeof body.memo === 'string' ? body.memo.trim().slice(0, 500) : null;
  const gradeEstimate =
    typeof body.gradeEstimate === 'string' ? body.gradeEstimate.trim().slice(0, 60) : null;
  const centeringScore =
    typeof body.centeringScore === 'number' && Number.isFinite(body.centeringScore)
      ? Math.max(0, Math.min(100, body.centeringScore))
      : null;
  const photoUrl =
    typeof body.photoUrl === 'string' && /^https?:\/\//.test(body.photoUrl)
      ? body.photoUrl.slice(0, 500)
      : null;

  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, name: defaultNameFor(userId) },
    });
    const created = await prisma.userCard.create({
      data: {
        userId,
        cardId,
        ocrSetCode,
        ocrCardNumber,
        snkrdunkApparelId,
        nickname,
        memo,
        gradeEstimate,
        centeringScore,
        photoUrl,
      },
    });
    res.status(201).json({ data: created });
  } catch (err) {
    // 디버깅용 — Prisma 에러 코드/메시지를 응답에도 실어준다.
    // (운영 중 발견된 500 원인 추적용. 향후 안정화되면 message 노출 빼도 됨.)
    const e = err as { code?: string; message?: string; name?: string };
    console.error('[me.cards.POST]', userId, 'err=', e?.name, e?.code, e?.message);
    res.status(500).json({
      error: 'internal',
      code: e?.code ?? null,
      name: e?.name ?? null,
      message: e?.message ?? null,
    });
  }
});

router.get('/favorites', async (req: Request, res: Response) => {
  try {
    const rows = await prisma.favoriteCard.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    res.json({ data: rows });
  } catch (err) {
    console.error('[me.favorites.GET]', err);
    res.status(500).json({ error: 'internal' });
  }
});

// 관심카드 + 스니덩 시세/이미지 enrich. 관심카드 페이지 전용.
router.get('/favorites/with-prices', async (req: Request, res: Response) => {
  try {
    const data = await getMyFavoritesWithPrices(req.user!.userId, 200);
    res.json({ data });
  } catch (err) {
    console.error('[me.favorites.with-prices]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.post('/favorites', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const apparelId = Number((req.body as { snkrdunkApparelId?: unknown } | null)?.snkrdunkApparelId);
  if (!Number.isInteger(apparelId) || apparelId <= 0) {
    return res.status(400).json({ error: 'snkrdunkApparelId 필요' });
  }
  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, name: defaultNameFor(userId) },
    });
    const row = await prisma.favoriteCard.upsert({
      where: { userId_snkrdunkApparelId: { userId, snkrdunkApparelId: apparelId } },
      update: {},
      create: { userId, snkrdunkApparelId: apparelId },
    });
    res.status(201).json({ data: row });
  } catch (err) {
    const e = err as { code?: string; message?: string; name?: string };
    console.error('[me.favorites.POST]', userId, 'err=', e?.name, e?.code, e?.message);
    res.status(500).json({
      error: 'internal',
      code: e?.code ?? null,
      name: e?.name ?? null,
      message: e?.message ?? null,
    });
  }
});

router.delete('/favorites/:apparelId', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const apparelId = Number(req.params.apparelId);
  if (!Number.isInteger(apparelId)) return res.status(400).json({ error: 'invalid apparelId' });
  try {
    await prisma.favoriteCard.deleteMany({
      where: { userId, snkrdunkApparelId: apparelId },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[me.favorites.DELETE]', err);
    res.status(500).json({ error: 'internal' });
  }
});

/**
 * KST 정각 기준 오늘 날짜 (YYYY-MM-DD). 일별 스냅샷 키.
 * 정각이 되는 순간 새 일자로 넘어가, 새 행이 upsert 된다.
 */
function kstDateKey(d: Date = new Date()): string {
  // UTC ms → KST (UTC+9). offset 계산은 Date.UTC 와 동일한 방식.
  const utcMs = d.getTime();
  const kstMs = utcMs + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  // KST 환산 후 UTC getter 가 KST 의 연/월/일 을 돌려준다.
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** kstDateKey 의 'days 일 전' 일자. */
function kstDateKeyShifted(daysBack: number): string {
  return kstDateKey(new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000));
}

/**
 * 포트폴리오 합계 — userCard 중 snkrdunkApparelId 가 있는 항목을 실시간 시세로
 * 합산해 JPY 총합을 반환. 관심카드(FavoriteCard) 는 의도적으로 제외 — 사용자가
 * "관심"으로 표시한 카드까지 자산으로 포함하면 부풀려진 자산이 됨.
 *
 * 추가로:
 *   - 오늘자 KST 일자 키로 PortfolioDailySnapshot upsert (정각이 되면 새 키)
 *   - 어제 일자 스냅샷이 있으면 등락 (절대값 + %) 반환
 *   - 최근 30 일 히스토리 반환 (차트용)
 */
router.get('/portfolio', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    const cards = await prisma.userCard.findMany({
      where: { userId, snkrdunkApparelId: { not: null } },
      select: { id: true, snkrdunkApparelId: true, createdAt: true },
    });
    const totalCount = await countMyCards(userId);
    const today = kstDateKey();

    let totalJpy = 0;
    let totalPsa10Jpy = 0;
    let pricedCount = 0;
    let pricedPsa10Count = 0;
    // 어제 대비 등락 계산용 — '오늘 추가한 카드'는 어제 스냅샷에 없으므로 제외.
    // (오늘 추가분을 포함하면 자산 유입이 가격 상승처럼 잡혀 등락이 부풀려짐)
    let comparableTodayJpy = 0;
    // 카드 리스트와 동일한 sales-chart 기준 등락. 오늘 추가분 제외, 어제부터 보유분만.
    let heldPrevChart = 0; // 어제(직전 거래 포인트) 시세 합
    let heldLastChart = 0; // 오늘(최신 포인트) 시세 합
    if (cards.length > 0) {
      // 같은 apparelId 가 여러 번 들어 있을 수 있으니 fetch 는 한 번만.
      const uniqueApparelIds: number[] = Array.from(
        new Set<number>(
          cards
            .map((c) => c.snkrdunkApparelId)
            .filter((v): v is number => typeof v === 'number'),
        ),
      );
      const PSA10_RE = /PSA\s*10\b/i;
      const PSA_ANY_RE = /PSA\s*\d+/i;
      const median = (arr: number[]): number => {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
      };
      // apparel.minPrice (현재 최저) + sales history median (raw / psa10) 모두 수집.
      const priceByApparel = new Map<
        number,
        { single: number; psa10: number; chartPrev: number; chartLast: number }
      >();
      await Promise.all(
        uniqueApparelIds.map(async (id: number) => {
          try {
            const [a, hist, chart] = await Promise.all([
              fetchSnkrdunkApparel(id),
              fetchSnkrdunkSalesHistory(id).catch(() => null),
              fetchSnkrdunkSalesChart(id).catch(() => null),
            ]);
            const history = hist?.history ?? [];
            const pickPrices = (predicate: (badge: string) => boolean) =>
              history
                .filter((h) => typeof h.price === 'number' && h.price > 0)
                .filter((h) => predicate((h.condition || h.label || '').trim()))
                .map((h) => h.price)
                .slice(0, 7);
            const psa10Prices = pickPrices((b) => PSA10_RE.test(b));
            // 싱글(raw) 단가는 PSA 등급 체결을 제외한 최근 체결 중앙값 기준.
            const rawMedian = median(pickPrices((b) => !PSA_ANY_RE.test(b)));
            // sales-chart/used 에는 PSA 등급 체결이 섞여 끝점이 등급가로 튈 수 있어,
            // raw 중앙값의 2.5배 초과 포인트는 등락 계산(어제/오늘 비교)에서도 제외.
            const rawCeil = rawMedian > 0 ? rawMedian * 2.5 : Infinity;
            const pts = (chart?.points ?? []).filter(
              (p) => typeof p[1] === 'number' && p[1] > 0 && p[1] <= rawCeil,
            );
            const chartLast = pts.length >= 1 ? pts[pts.length - 1][1] : 0;
            const chartPrev = pts.length >= 2 ? pts[pts.length - 2][1] : 0;
            // 표시/합산 단가는 raw 중앙값 우선, 없으면 차트 끝점→최저매물.
            let single = rawMedian > 0 ? rawMedian : chartLast;
            if (single === 0 && a && typeof a.minPrice === 'number' && a.minPrice > 0) {
              single = a.minPrice;
            }
            const psa10 = median(psa10Prices);
            priceByApparel.set(id, { single, psa10, chartPrev, chartLast });
          } catch (err) {
            console.warn('[me.portfolio] apparel fetch failed', id, err);
          }
        }),
      );
      for (const c of cards) {
        const p = c.snkrdunkApparelId != null ? priceByApparel.get(c.snkrdunkApparelId) : null;
        if (!p) continue;
        const addedToday = kstDateKey(c.createdAt) === today;
        if (p.single > 0) {
          totalJpy += p.single;
          pricedCount += 1;
          if (!addedToday) comparableTodayJpy += p.single;
        }
        if (p.psa10 > 0) {
          totalPsa10Jpy += p.psa10;
          pricedPsa10Count += 1;
        }
        // 등락(차트 기준): 어제부터 보유 + 직전/최신 포인트 둘 다 있는 카드만.
        if (!addedToday && p.chartPrev > 0 && p.chartLast > 0) {
          heldPrevChart += p.chartPrev;
          heldLastChart += p.chartLast;
        }
      }
    }

    // 오늘자 스냅샷 upsert — KST 정각 넘어가면 새 행. 같은 날 호출은 update.
    let yesterdayJpy: number | null = null;
    let history: Array<{ date: string; totalJpy: number }> = [];
    try {
      await prisma.portfolioDailySnapshot.upsert({
        where: { userId_date: { userId, date: today } },
        update: { totalJpy, pricedCount, totalCount },
        create: { userId, date: today, totalJpy, pricedCount, totalCount },
      });

      // 어제 일자 스냅샷 — 정확히 어제(yesterday) 키, 없으면 그 이전 가장 가까운 행.
      const yesterdayKey = kstDateKeyShifted(1);
      const prev = await prisma.portfolioDailySnapshot.findFirst({
        where: { userId, date: { lt: today } },
        orderBy: { date: 'desc' },
        select: { date: true, totalJpy: true },
      });
      if (prev) yesterdayJpy = prev.totalJpy;
      // (yesterdayKey 는 폴백 라벨용 — 어제 정확한 키가 없어도 동작.)
      void yesterdayKey;

      // 차트용 히스토리 (오래된 → 최신). 클라이언트에서 일/주/월 단위로 집계한다.
      const rows = await prisma.portfolioDailySnapshot.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 365,
        select: { date: true, totalJpy: true },
      });
      history = rows.reverse().map((r) => ({ date: r.date, totalJpy: r.totalJpy }));
    } catch (err) {
      console.warn('[me.portfolio] snapshot upsert/read failed', err);
    }

    // 등락 — 오늘 추가분 제외. 우선순위:
    //  1) sales-chart 기준(카드 리스트와 동일): 어제부터 보유분의 직전→최신 포인트 합 비교
    //  2) 차트가 없으면 일일 스냅샷 폴백(comparableTodayJpy vs 어제 스냅샷)
    let changeAbsJpy: number | null = null;
    let changePct: number | null = null;
    if (heldPrevChart > 0) {
      changeAbsJpy = heldLastChart - heldPrevChart;
      changePct = ((heldLastChart - heldPrevChart) / heldPrevChart) * 100;
    } else if (yesterdayJpy != null && yesterdayJpy > 0) {
      changeAbsJpy = comparableTodayJpy - yesterdayJpy;
      changePct = ((comparableTodayJpy - yesterdayJpy) / yesterdayJpy) * 100;
    }

    res.json({
      data: {
        totalJpy,
        pricedCount,
        totalCount,
        totalPsa10Jpy,
        pricedPsa10Count,
        yesterdayJpy,
        changeAbsJpy,
        changePct,
        history,
        asOfDate: today,
      },
    });
  } catch (err) {
    console.error('[me.portfolio]', err);
    res.status(500).json({ error: 'internal' });
  }
});

// NOTE: 정적 경로 (/cards/with-prices) 는 파라미터 경로 (/cards/:id) 보다
// 먼저 등록해야 한다. Express 가 등록 순서대로 매치하므로, 반대 순서면
// `:id = "with-prices"` 로 잡혀 컬렉션 페이지가 400 으로 깨진다.
router.get('/cards/with-prices', async (req: Request, res: Response) => {
  try {
    const data = await getMyCardsWithPrices(req.user!.userId, 200);
    res.json({ data });
  } catch (err) {
    console.error('[me.cards.with-prices]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.get('/cards/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const row = await prisma.userCard.findUnique({ where: { id } });
    if (!row || row.userId !== req.user!.userId) {
      return res.status(404).json({ error: 'not found' });
    }
    res.json({ data: row });
  } catch (err) {
    console.error('[me.cards.GET id]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.delete('/cards/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const row = await prisma.userCard.findUnique({ where: { id } });
    if (!row || row.userId !== req.user!.userId) {
      return res.status(404).json({ error: 'not found' });
    }
    await prisma.userCard.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[me.cards.DELETE]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.get('/feeds', async (req: Request, res: Response) => {
  try {
    const data = await getMyFeeds(req.user!.userId);
    res.json({ data });
  } catch (err) {
    console.error('[me.feeds]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.get('/trades', async (req: Request, res: Response) => {
  try {
    const data = await getMyTrades(req.user!.userId);
    res.json({ data });
  } catch (err) {
    console.error('[me.trades]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.get('/bookmarks', async (req: Request, res: Response) => {
  try {
    const data = await getMyBookmarks(req.user!.userId);
    res.json({ data });
  } catch (err) {
    console.error('[me.bookmarks]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.patch('/name', async (req: Request, res: Response) => {
  const raw = (req.body as { name?: unknown })?.name;
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (name.length < 2 || name.length > 20) {
    return res.status(400).json({ error: '닉네임은 2~20자' });
  }
  if (!/^[\p{L}\p{N}_\s.·-]+$/u.test(name)) {
    return res.status(400).json({ error: '사용할 수 없는 문자가 포함됨' });
  }
  try {
    const user = await prisma.user.upsert({
      where: { id: req.user!.userId },
      update: { name },
      create: { id: req.user!.userId, name },
      select: { id: true, name: true },
    });
    res.json({ data: user });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[me.name]', msg);
    if (msg.includes('Unique constraint')) {
      return res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });
    }
    res.status(500).json({ error: '서버 오류: ' + msg });
  }
});

router.get('/inventory', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    const checkIn = await runDailyCheckIn(userId).catch(() => null);
    const inventory = await getMyInventory(userId);
    res.json({ inventory, checkIn });
  } catch (err) {
    console.error('[me.inventory]', err);
    res.status(500).json({ error: 'internal' });
  }
});

router.post('/points/spend', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const amountRaw = (req.body as { amount?: unknown } | null)?.amount;
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ ok: false, error: 'invalid amount' });
  }
  try {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (!u) return res.status(404).json({ ok: false, error: 'user not found' });
    if (u.points < amount) return res.status(400).json({ ok: false, error: '포인트 부족' });
    await prisma.user.update({
      where: { id: userId },
      data: { points: { decrement: amount } },
    });
    const inv = await getMyInventory(userId);
    res.json({ ok: true, inv });
  } catch (err) {
    console.error('[me.points.spend]', err);
    res.status(500).json({ ok: false, error: 'internal' });
  }
});

router.post('/inventory/buy', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const body = (req.body ?? {}) as {
    action?: 'buy' | 'pick';
    kind?: 'avatar' | 'bg' | 'frame';
    id?: string;
    price?: number;
  };
  const { action, kind, id, price } = body;
  if (!action || !kind || !id) {
    return res.status(400).json({ ok: false, error: 'missing fields' });
  }
  try {
    if (action === 'pick') {
      const r =
        kind === 'avatar' ? await pickAvatar(userId, id)
        : kind === 'bg' ? await pickBackground(userId, id)
        : kind === 'frame' ? await pickFrame(userId, id)
        : { ok: false as const, error: 'invalid kind' };
      return res.json(r);
    }
    if (action === 'buy') {
      const p = Number(price ?? 0);
      const r =
        kind === 'avatar' ? await buyAvatar(userId, id, p)
        : kind === 'bg' ? await buyBackground(userId, id, p)
        : kind === 'frame' ? await buyFrame(userId, id, p)
        : { ok: false as const, error: 'invalid kind' };
      return res.json(r);
    }
    res.status(400).json({ ok: false, error: 'invalid action' });
  } catch (err) {
    console.error('[me.inventory.buy]', err);
    res.status(500).json({ ok: false, error: 'internal' });
  }
});

// ───── 외부 매물 관심목록 (MVC 경매 / 번개장터) ─────

const LISTING_SOURCES = new Set(['mvc', 'bunjang']);

/** GET /api/me/listing-favorites?source=mvc|bunjang (source 생략 시 전체) */
router.get('/listing-favorites', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const source = typeof req.query.source === 'string' ? req.query.source : undefined;
  if (source && !LISTING_SOURCES.has(source)) {
    return res.status(400).json({ error: 'invalid source' });
  }
  try {
    const rows = await prisma.listingFavorite.findMany({
      where: { userId, ...(source ? { source } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    res.json({ data: rows });
  } catch (err) {
    console.error('[me.listing-favorites.GET]', err);
    res.status(500).json({ error: 'internal' });
  }
});

/** POST /api/me/listing-favorites — { source, externalId, title?, imageUrl?, price?, url? } */
router.post('/listing-favorites', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const body = (req.body ?? {}) as {
    source?: string;
    externalId?: string | number;
    title?: string;
    imageUrl?: string | null;
    price?: number | null;
    url?: string;
  };
  const source = String(body.source ?? '');
  const externalId = String(body.externalId ?? '').trim();
  if (!LISTING_SOURCES.has(source) || !externalId) {
    return res.status(400).json({ error: 'source, externalId 필요' });
  }
  const price =
    typeof body.price === 'number' && Number.isFinite(body.price) ? Math.round(body.price) : null;
  const data = {
    title: (body.title ?? '').slice(0, 300),
    imageUrl: body.imageUrl ? String(body.imageUrl).slice(0, 1000) : null,
    price,
    url: (body.url ?? '').slice(0, 1000),
  };
  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, name: defaultNameFor(userId) },
    });
    const row = await prisma.listingFavorite.upsert({
      where: { userId_source_externalId: { userId, source, externalId } },
      update: data,
      create: { userId, source, externalId, ...data },
    });
    res.status(201).json({ data: row });
  } catch (err) {
    const e = err as { code?: string; message?: string; name?: string };
    console.error('[me.listing-favorites.POST]', userId, e?.code, e?.message);
    res.status(500).json({ error: 'internal', code: e?.code ?? null });
  }
});

/** DELETE /api/me/listing-favorites/:source/:externalId */
router.delete('/listing-favorites/:source/:externalId', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { source, externalId } = req.params;
  if (!LISTING_SOURCES.has(source) || !externalId) {
    return res.status(400).json({ error: 'invalid params' });
  }
  try {
    await prisma.listingFavorite.deleteMany({ where: { userId, source, externalId } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[me.listing-favorites.DELETE]', err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
