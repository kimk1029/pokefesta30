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
const FULL_DETAIL = /** @type {'low'|'high'|'auto'} */ (process.env.VISION_FULL_DETAIL ?? 'low');
const ZOOM_DETAIL = /** @type {'low'|'high'|'auto'} */ (process.env.VISION_ZOOM_DETAIL ?? 'high');
const MAX_DIM = Number(process.env.VISION_MAX_DIM ?? 1024);
const MAX_OUTPUT_TOKENS = 80;

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
    },
    required: ['name', 'nameJa', 'setCode', 'setName', 'cardNumber', 'totalNumber', 'rarity', 'language'],
  },
};

// Two-image prompt. Order matters — we tell the model "img1 for name, img2
// for codes". Without this hint it averages info across both, which loses
// the very accuracy gain we cropped for.
const SYSTEM_PROMPT =
  'Pokémon TCG card fields as JSON. Image 1 = full card → name (as printed) ' +
  'and nameJa (the Pokémon\'s Japanese katakana name, e.g. レアコイル). ' +
  'Image 2 = zoomed bottom-left badge → setCode (e.g. sv8, sv6, m1l), ' +
  'cardNumber, totalNumber, rarity. Empty string if unreadable.';

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
