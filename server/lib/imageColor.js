/**
 * 이미지 dominant color 추출 — sharp 의 stats() 가 채널별 평균을 주지만 그건
 * 그냥 평균(흙색) 으로 수렴하니까 안 쓰고, 이미지를 작은 그리드로 다운샘플 한 뒤
 * 픽셀 hue 빈도 기반으로 가장 두드러진 색을 뽑는다. 그 뒤 채도/명도를 강제로
 * 끌어올려 "네온" 톤(HSL S≥95%, L≈55%) 으로 변환.
 *
 * 캐시: URL 키 LRU (단순 Map + 삭제 정책). 카드 이미지는 정적이라 한 번 계산
 * 하면 다시 가져올 일 없음.
 */

import sharp from 'sharp';

const CACHE = new Map();
const CACHE_MAX = 500;
const FETCH_TIMEOUT_MS = 8000;

const DEFAULT_NEON = '#22F58C'; // 그린 네온 — URL 없거나 fetch 실패 시 폴백

function setCache(key, value) {
  if (CACHE.size >= CACHE_MAX) {
    // 가장 오래된(insertion-order 가장 앞) 항목 제거.
    const firstKey = CACHE.keys().next().value;
    if (firstKey !== undefined) CACHE.delete(firstKey);
  }
  CACHE.set(key, value);
}

/**
 * @param {string} url
 * @returns {Promise<{ hex: string, fromCache: boolean, fallback: boolean }>}
 */
export async function dominantNeonForUrl(url) {
  const u = String(url ?? '').trim();
  if (!u) return { hex: DEFAULT_NEON, fromCache: false, fallback: true };

  if (CACHE.has(u)) {
    return { hex: CACHE.get(u), fromCache: true, fallback: false };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch(u, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!resp.ok) throw new Error(`fetch ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());

    // 32x32 로 다운샘플, raw RGB 추출.
    const { data, info } = await sharp(buf)
      .resize(32, 32, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const hex = pickDominantNeonHex(data, info.width, info.height);
    setCache(u, hex);
    return { hex, fromCache: false, fallback: false };
  } catch (e) {
    // 실패 시에도 캐시 — 같은 깨진 URL 을 반복 시도 안 함.
    setCache(u, DEFAULT_NEON);
    return { hex: DEFAULT_NEON, fromCache: false, fallback: true };
  }
}

/**
 * RGB raw 픽셀 버퍼에서 채도 있는 픽셀 hue 빈도를 세고, 가장 흔한 hue 를 뽑아
 * 네온 톤(S=100%, L=55%) 의 hex 로 반환.
 *
 * @param {Buffer} data
 * @param {number} w
 * @param {number} h
 */
function pickDominantNeonHex(data, w, h) {
  // 12 도 단위로 hue bin (총 30 bin). 무채색은 별도 카운트 안 함.
  const BINS = 30;
  const bins = new Float32Array(BINS);
  const N = w * h;
  for (let i = 0; i < N; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const [hh, ss, ll] = rgbToHsl(r, g, b);
    // 무채색(저채도) + 너무 어두운/밝은 픽셀 제외 — 카드 배경/광원이 결과 흐림.
    if (ss < 0.25) continue;
    if (ll < 0.15 || ll > 0.9) continue;
    // 채도 + 명도 적절한 픽셀에 가중치. mid-tone 채도 높은 픽셀 우선.
    const weight = ss * (1 - Math.abs(ll - 0.5) * 1.4);
    const idx = Math.min(BINS - 1, Math.floor((hh / 360) * BINS));
    bins[idx] += Math.max(0, weight);
  }

  let bestIdx = 0;
  let bestVal = 0;
  for (let i = 0; i < BINS; i++) {
    if (bins[i] > bestVal) {
      bestVal = bins[i];
      bestIdx = i;
    }
  }
  if (bestVal <= 0) return DEFAULT_NEON;

  const hue = (bestIdx + 0.5) * (360 / BINS);
  // 네온 톤으로 강제 — 채도 100%, 명도 60% (Highlight 가독성).
  return hslToHex(hue, 1, 0.6);
}

/* -------- color math -------- */

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
        break;
      case gn:
        h = ((bn - rn) / d + 2) * 60;
        break;
      default:
        h = ((rn - gn) / d + 4) * 60;
    }
  }
  return [h, s, l];
}

function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = (h / 60) % 6;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else[r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const to255 = (v) => Math.round((v + m) * 255);
  return `#${[to255(r), to255(g), to255(b)].map((n) => n.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}
