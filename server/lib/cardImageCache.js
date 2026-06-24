/**
 * 카드 아트 자체 CDN 캐싱.
 *
 * snkrdunk 원본 이미지를 NAS 디스크에 webp 로 "처음 본 카드만" 1회 받아두고,
 * 이후엔 우리 도메인(/api/cdn/cards/<apparelId>.webp)으로 서빙한다.
 * 핫링크(원본 차단·URL 만료) 의존을 끊고, webp 로 용량/속도를 최적화하는 게 목적.
 *
 * 정책:
 *   - lazy: 전체 시드 없이, 카드가 조회/검색될 때 백그라운드로 한 장씩 캐싱.
 *   - fire-and-forget: 응답을 막지 않는다. 모든 실패는 로깅만.
 *   - 멱등: 파일이 이미 있으면 네트워크 없이 DB(cdnImageUrl)만 보정.
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { prisma } from './prisma.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** webp 캐시 루트. server/public/cdn → express.static('/api/cdn') 로 노출. */
export const CARD_CDN_DIR = process.env.CARD_CDN_DIR || join(__dirname, '../public/cdn');
const CARDS_DIR = join(CARD_CDN_DIR, 'cards');

/** 카드 1장의 공개 경로 (상대 — Vercel→NAS 프록시를 그대로 통과). */
function publicUrl(apparelId) {
  return `/api/cdn/cards/${apparelId}.webp`;
}

function filePath(apparelId) {
  return join(CARDS_DIR, `${apparelId}.webp`);
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** 동시 중복 다운로드 방지(같은 카드 동시 조회). */
const inFlight = new Set();

/**
 * apparelId 의 원본 이미지를 webp 로 캐싱하고 DB cdnImageUrl 을 채운다.
 * await 불필요 — `void ensureCardImage(...)` 로 호출.
 *
 * @param {number} apparelId
 * @param {string | null | undefined} sourceUrl snkrdunk 원본 이미지 URL
 */
export async function ensureCardImage(apparelId, sourceUrl) {
  if (!apparelId || !sourceUrl) return;
  if (inFlight.has(apparelId)) return;
  inFlight.add(apparelId);
  try {
    const dest = filePath(apparelId);
    const url = publicUrl(apparelId);

    // 이미 캐싱돼 있으면 다운로드 생략 — DB 가 비어있을 때만 보정.
    if (await exists(dest)) {
      await prisma.snkrdunkCard
        .updateMany({ where: { apparelId, cdnImageUrl: null }, data: { cdnImageUrl: url } })
        .catch(() => {});
      return;
    }

    const res = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`source ${res.status}`);
    const input = Buffer.from(await res.arrayBuffer());

    const webp = await sharp(input)
      .resize({ width: 720, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    await mkdir(CARDS_DIR, { recursive: true });
    await writeFile(dest, webp);

    // 행이 아직 없을 수 있어(upsert 와의 경쟁) updateMany — 없으면 0건, 다음 조회에서 보정.
    await prisma.snkrdunkCard
      .updateMany({ where: { apparelId }, data: { cdnImageUrl: url } })
      .catch(() => {});
  } catch (err) {
    console.error('[cardImageCache]', apparelId, err?.message || err);
  } finally {
    inFlight.delete(apparelId);
  }
}

/** 이미 캐싱된 카드의 공개 URL (없으면 null). 단일 PK 조회 — 핫패스 안전. */
export async function getCachedCardImageUrl(apparelId) {
  try {
    const row = await prisma.snkrdunkCard.findUnique({
      where: { apparelId },
      select: { cdnImageUrl: true },
    });
    return row?.cdnImageUrl ?? null;
  } catch {
    return null;
  }
}
