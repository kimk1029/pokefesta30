/**
 * Vision OCR via OpenAI gpt-4o-mini. Optimized for:
 *   - minimal prompt tokens (short English system msg, no user text)
 *   - deterministic output (temperature 0 + fixed seed)
 *   - guaranteed JSON shape (Structured Outputs / json_schema strict)
 *   - bounded cost (max_tokens cap + image downsize via sharp)
 *
 * Accuracy on the small bottom-left set/number/rarity badge is the bottleneck
 * (a misread `sv1` instead of `sv8` cascades into a TCGdex 404 → no image, no
 * price). To fight this we send TWO images in one request:
 *   1. full card at `low` detail — cheap, used for the card name
 *   2. zoomed bottom-left crop at `high` detail — used for setCode + number
 *      + rarity. Cropping first means the small badge fills more of the
 *      512px-tile budget, dramatically improving readability.
 */
import sharp from 'sharp';

const MODEL = process.env.VISION_MODEL ?? 'gpt-4o-mini';
// 'low' → 'high': outerQuad/innerQuad 코너 좌표는 512px 썸네일(low)로는 부정확.
// high 디테일 타일이 있어야 카드 모서리를 픽셀 단위로 짚는다. (gpt-4o-mini 라 저렴)
const FULL_DETAIL = /** @type {'low'|'high'|'auto'} */ (process.env.VISION_FULL_DETAIL ?? 'high');
const ZOOM_DETAIL = /** @type {'low'|'high'|'auto'} */ (process.env.VISION_ZOOM_DETAIL ?? 'high');
const MAX_DIM = Number(process.env.VISION_MAX_DIM ?? 1024);
// 80 → 220 — outerQuad/innerQuad 각 8 number(=8 토큰×2) + JSON 키 마진.
const MAX_OUTPUT_TOKENS = 220;

// Modern Pokémon TCG rarity codes. The model frequently returns long-form
// strings ("Rare", "Uncommon", "Common") at temp 0 without an enum, so we
// constrain — the matcher / DB only know the short codes.
const RARITIES = ['C', 'U', 'R', 'RR', 'SR', 'SAR', 'HR', 'UR', 'AR', 'PROMO', ''];

const SCHEMA = {
  name: 'card',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: { type: 'string' },
      // Japanese Pokémon name (e.g. レアコイル). Lets the server search TCGdex
      // JA by name when the exact setCode-number lookup misses — most AR/SAR
      // cards beyond a set's base count aren't ingested, but searching by
      // name returns siblings of the same Pokémon with image + price.
      nameJa: { type: 'string' },
      setCode: { type: 'string' },
      setName: { type: 'string' },
      cardNumber: { type: 'string' },
      totalNumber: { type: 'string' },
      rarity: { type: 'string', enum: RARITIES },
      language: { type: 'string', enum: ['ko', 'jp', 'en', ''] },
      // 카드 외곽(=물리적 컷 라인) 4코너. image 1 기준 normalized 0..1 좌표,
      // [TL.x, TL.y, TR.x, TR.y, BR.x, BR.y, BL.x, BL.y] 평탄화 8 number.
      // 추정 불가능하면 빈 배열. strict json_schema 에서 array length 제약을
      // 못 걸므로 길이 검증은 서버에서.
      outerQuad: {
        type: 'array',
        items: { type: 'number' },
      },
      // 카드 인쇄 프레임(컬러 보더 안쪽) 4코너. 외곽보다 살짝 안쪽. 같은 포맷.
      innerQuad: {
        type: 'array',
        items: { type: 'number' },
      },
    },
    required: ['name', 'nameJa', 'setCode', 'setName', 'cardNumber', 'totalNumber', 'rarity', 'language', 'outerQuad', 'innerQuad'],
  },
};

// Two-image prompt. Order matters — we tell the model "img1 for name, img2
// for codes". Without this hint it averages info across both, which loses
// the very accuracy gain we cropped for.
const SYSTEM_PROMPT =
  'Pokémon TCG card fields as JSON. Image 1 = full card → name (as printed) ' +
  'and nameJa (the Pokémon\'s Japanese katakana name, e.g. レアコイル). ' +
  'Image 2 = zoomed bottom-left badge → setCode (e.g. sv8, sv6, m1l), ' +
  'cardNumber, totalNumber, rarity. Empty string if unreadable. ' +
  // 외곽/내곽 quad — Image 1 기준. 좌표는 0~1 normalized.
  'outerQuad: 8 numbers = full card OUTER cut boundary 4 corners in this order ' +
  '[TL.x, TL.y, TR.x, TR.y, BR.x, BR.y, BL.x, BL.y], normalized to image 1 ' +
  '(0=left/top, 1=right/bottom). Look at image 1 carefully and place each corner ' +
  'EXACTLY on the visible physical card edge (where card meets background), with ' +
  '3-decimal precision — do NOT default to the image borders unless the card truly ' +
  'fills the frame. innerQuad: 8 numbers, same format, the INNER printed frame line ' +
  '(the rectangle just inside the colored card border, around artwork+text) — it is ' +
  'strictly inside outerQuad on all four sides. ' +
  'Empty array [] if the card boundary is not clearly visible.';

let openaiClient = null;
async function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (openaiClient) return openaiClient;
  try {
    const { default: OpenAI } = await import('openai');
    openaiClient = new OpenAI();
    return openaiClient;
  } catch {
    return null;
  }
}

/**
 * Crop the bottom-left info zone (set badge + card number + rarity letter).
 * The exact ratios assume the upstream document scanner has already done
 * perspective correction, so the card edges are aligned with the image.
 */
async function bottomLeftCrop(buf) {
  const meta = await sharp(buf).metadata();
  const W = meta.width ?? 1000;
  const H = meta.height ?? 1400;
  // Slightly bigger than the badge itself — gives room for OCR context
  // (card number, total, rarity letter, illustrator credit).
  const cropW = Math.max(120, Math.round(W * 0.4));
  const cropH = Math.max(80, Math.round(H * 0.18));
  return sharp(buf)
    .extract({
      left: 0,
      top: Math.max(0, H - cropH),
      width: Math.min(W, cropW),
      height: Math.min(H, cropH),
    })
    // Upscale + sharpen → the set badge is white-on-black tiny text; without
    // sharpening the JPEG re-encode smears it.
    .resize({ width: 1024, withoutEnlargement: false })
    .sharpen()
    .jpeg({ quality: 88 })
    .toBuffer();
}

export async function visionExtract(imageBuffer) {
  const client = await getOpenAI();
  if (!client) return null;

  const [fullJpg, blJpg] = await Promise.all([
    sharp(imageBuffer)
      .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer(),
    bottomLeftCrop(imageBuffer),
  ]);

  const fullUrl = `data:image/jpeg;base64,${fullJpg.toString('base64')}`;
  const zoomUrl = `data:image/jpeg;base64,${blJpg.toString('base64')}`;

  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      temperature: 0,
      seed: 0,
      max_tokens: MAX_OUTPUT_TOKENS,
      response_format: { type: 'json_schema', json_schema: SCHEMA },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: fullUrl, detail: FULL_DETAIL } },
            { type: 'image_url', image_url: { url: zoomUrl, detail: ZOOM_DETAIL } },
          ],
        },
      ],
    });
    const txt = res.choices[0]?.message?.content;
    if (!txt) return null;
    const obj = JSON.parse(txt);
    return {
      name: str(obj.name),
      nameJa: str(obj.nameJa),
      setCode: str(obj.setCode).toLowerCase(),
      setName: str(obj.setName),
      cardNumber: str(obj.cardNumber),
      totalNumber: str(obj.totalNumber),
      rarity: str(obj.rarity).toUpperCase(),
      language: str(obj.language).toLowerCase(),
      outerQuad: sanitizeQuad(obj.outerQuad),
      innerQuad: sanitizeQuad(obj.innerQuad),
    };
  } catch (e) {
    console.warn('[vision] failed:', e?.message ?? e);
    return null;
  }
}

export function visionAvailable() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function str(v) {
  return typeof v === 'string' ? v : '';
}

/**
 * Vision 응답의 quad(평탄화 8 number) sanity 체크 → 4 코너 [{x,y},...] 또는 null.
 * - 길이 8 + 모두 유한 수 + 0..1 범위
 * - 면적이 너무 작거나(<5%) 거의 전면(>=99%) 이면 reject — 의미 없는 추정
 * - x/y 가 같은 코너 두 개 이상이면 degenerate → reject
 */
function sanitizeQuad(input) {
  if (!Array.isArray(input) || input.length !== 8) return null;
  const nums = input.map((n) => Number(n));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  if (nums.some((n) => n < -0.05 || n > 1.05)) return null;
  const pts = [
    { x: clamp01(nums[0]), y: clamp01(nums[1]) },
    { x: clamp01(nums[2]), y: clamp01(nums[3]) },
    { x: clamp01(nums[4]), y: clamp01(nums[5]) },
    { x: clamp01(nums[6]), y: clamp01(nums[7]) },
  ];
  // 같은 점 중복?
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      if (Math.abs(pts[i].x - pts[j].x) < 0.01 && Math.abs(pts[i].y - pts[j].y) < 0.01) {
        return null;
      }
    }
  }
  // 면적 (shoelace)
  const area = Math.abs(
    pts[0].x * pts[1].y - pts[1].x * pts[0].y +
    pts[1].x * pts[2].y - pts[2].x * pts[1].y +
    pts[2].x * pts[3].y - pts[3].x * pts[2].y +
    pts[3].x * pts[0].y - pts[0].x * pts[3].y,
  ) / 2;
  if (area < 0.05 || area >= 0.99) return null;
  return orderQuad(pts);
}

/**
 * 코너 순서 정규화 — 모델이 순서를 뒤섞어 줘도 [TL, TR, BR, BL] 로 재배열.
 * 중심점 기준 각도 정렬(시계방향) 후 x+y 최소인 점을 TL 로 회전.
 */
function orderQuad(pts) {
  const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4;
  const cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4;
  // 화면 좌표(y 아래로 증가)에서 atan2 오름차순 = 시계방향.
  const sorted = [...pts].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
  );
  let tlIdx = 0;
  let best = Infinity;
  for (let i = 0; i < 4; i++) {
    const d = sorted[i].x + sorted[i].y;
    if (d < best) {
      best = d;
      tlIdx = i;
    }
  }
  return [0, 1, 2, 3].map((i) => sorted[(tlIdx + i) % 4]);
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}
