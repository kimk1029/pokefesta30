/**
 * PaddleOCR sidecar client. Calls a local Python FastAPI server (port 3002)
 * that loads PaddleOCR(lang='korean') once at startup. Free, accurate Korean
 * recognition — much better than Tesseract on stylized card fonts.
 *
 * Returns null when the sidecar isn't reachable so the Node OCR path can
 * gracefully fall back to Tesseract.
 */
import { request as httpRequest } from 'node:http';
import { Buffer } from 'node:buffer';
import sharp from 'sharp';
import { parseBottomLeft } from './parse.js';

const PADDLE_URL = process.env.PADDLE_OCR_URL ?? 'http://127.0.0.1:3002';

export function paddleAvailable() {
  return Boolean(PADDLE_URL);
}

export async function paddleHealthcheck() {
  try {
    const res = await fetch(`${PADDLE_URL}/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Send the card image to the sidecar and return all detected text lines.
 * @param {Buffer} imageBuffer - JPEG/PNG bytes
 * @returns {Promise<{ lines: Array<{ text:string, conf:number, box:number[][] }>, fullText: string, durationMs: number } | null>}
 */
export async function paddleExtract(imageBuffer) {
  const boundary = '----paddleform' + Math.random().toString(16).slice(2);
  const head =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="image"; filename="card.jpg"\r\n` +
    `Content-Type: image/jpeg\r\n\r\n`;
  const tail = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([Buffer.from(head, 'utf8'), imageBuffer, Buffer.from(tail, 'utf8')]);

  const url = new URL(`${PADDLE_URL}/ocr`);
  return new Promise((resolve) => {
    const req = httpRequest(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
        timeout: 90_000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            console.warn('[paddle] non-200:', res.statusCode);
            return resolve(null);
          }
          try {
            const json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            resolve(json);
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on('timeout', () => {
      console.warn('[paddle] timeout');
      req.destroy();
      resolve(null);
    });
    req.on('error', (err) => {
      console.warn('[paddle] request error:', err.message);
      resolve(null);
    });
    req.end(body);
  });
}

/**
 * High-level scan: runs Paddle on the full card (for the name + body) and
 * separately on a 2x-upscaled bottom strip (for set#/cardNumber/rarity which
 * the Korean detector tends to miss because the text is small + italic).
 * Returns a normalized `extracted` block compatible with the Node response.
 *
 * @param {Buffer} imageBuffer
 * @param {string} langHint  'ko' | 'jp' | 'en' | ''
 */
export async function paddleScan(imageBuffer, langHint = '') {
  const meta = await sharp(imageBuffer).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  if (!W || !H) return null;

  // Bottom 7% crop, upscaled 2x — recovers detection for the tiny ID line.
  const bottomTop = Math.max(0, Math.round(H * 0.93));
  const bottomH = H - bottomTop;
  const bottomBuf = await sharp(imageBuffer)
    .extract({ left: 0, top: bottomTop, width: W, height: bottomH })
    .resize({ width: W * 2, kernel: sharp.kernel.lanczos3 })
    .jpeg({ quality: 95 })
    .toBuffer();

  // Top 11% crop, upscaled 2x — same trick for the card name. PaddleOCR's
  // detector skips Korean titles when run on the full card because the text
  // sits over a colored gradient and looks small relative to the page.
  const topH = Math.round(H * 0.11);
  const topBuf = await sharp(imageBuffer)
    .extract({ left: 0, top: 0, width: W, height: topH })
    .resize({ width: W * 2, kernel: sharp.kernel.lanczos3 })
    .jpeg({ quality: 95 })
    .toBuffer();

  // Bottom-left 4–36% × bottom 6% — the white-on-black set badge ("m1L") is
  // too small to detect on the full image AND on the wide bottom strip; it
  // only shows up reliably when given to PaddleOCR as a tight bottom-left
  // crop at 2× upscale. Empirically:
  //   2× wide  → MIL 99%   ← winner
  //   3× wide  → MIL 99%
  //   4×+ tight → no detection (too zoomed-out for the recognizer's
  //               training distribution)
  const blLeft = Math.round(W * 0.04);
  const blTop = Math.round(H * 0.92);
  const blW = Math.round(W * 0.32);
  const blH = Math.round(H * 0.06);
  const blBuf = await sharp(imageBuffer)
    .extract({ left: blLeft, top: blTop, width: blW, height: blH })
    .resize({ width: blW * 2, kernel: sharp.kernel.lanczos3 })
    .jpeg({ quality: 95 })
    .toBuffer();

  // Bottom-RIGHT mirror — some prints (older sets, certain promos) place
  // the card info on the right. We don't know which corner has the code
  // until we OCR both, so run both crops and let parseBottomLeft pick the
  // one with a usable cardNumber match.
  const brLeft = Math.round(W * 0.64);
  const brTop = blTop;
  const brW = Math.round(W * 0.32);
  const brH = blH;
  const brBuf = await sharp(imageBuffer)
    .extract({ left: brLeft, top: brTop, width: brW, height: brH })
    .resize({ width: brW * 2, kernel: sharp.kernel.lanczos3 })
    .jpeg({ quality: 95 })
    .toBuffer();

  // PaddleOCR is single-threaded inside the sidecar — call sequentially.
  // Run the BOTTOM-LEFT zoom first because it's the cleanest source of
  // card-info: tight crop, high resize, gives back lines like
  // "M3" and "088/080 AR" with 99% confidence. The wide bottom strip
  // tends to fuse digits across sources (e.g. "10080/880") and would
  // otherwise win the field-fill race against the cleaner blRes data.
  const blRes = await paddleExtract(blBuf);
  const brRes = await paddleExtract(brBuf);
  const bottomRes = await paddleExtract(bottomBuf);
  const topRes = await paddleExtract(topBuf);

  if (!bottomRes && !topRes && !blRes && !brRes) return null;

  // Base result; the bottom-strip / bottom-left passes below fill in the
  // card-info fields, the top-strip pass fills in the name.
  const extracted = {
    name: '',
    setCode: '',
    cardNumber: '',
    totalNumber: '',
    rarity: '',
    language: langHint,
  };

  // Bottom-LEFT / BOTTOM-RIGHT zooms → highest-quality source for setCode /
  // cardNumber / totalNumber / rarity. Process both, prefer whichever yields
  // a confident cardNumber (typically only one corner has the info row).
  const cornerPasses = [
    { name: 'bl', res: blRes },
    { name: 'br', res: brRes },
  ];
  for (const pass of cornerPasses) {
    if (!pass.res || !pass.res.lines?.length) continue;
    const text = pass.res.lines.map((l) => l.text).join(' ');
    const parsed = parseBottomLeft(text);
    if (parsed.setCode && !extracted.setCode) extracted.setCode = parsed.setCode;
    if (parsed.cardNumber && !extracted.cardNumber) {
      extracted.cardNumber = parsed.cardNumber.replace(/^0+(?=\d)/, '') || '0';
      if (parsed.totalNumber) extracted.totalNumber = parsed.totalNumber;
    }
    if (parsed.rarity && !extracted.rarity) extracted.rarity = parsed.rarity;
  }

  // Fill in bottom-row fields from the upscaled crop.
  if (bottomRes && bottomRes.lines?.length) {
    const allText = bottomRes.lines.map((l) => l.text).join(' ');
    const parsed = parseBottomLeft(allText);
    if (parsed.cardNumber && !extracted.cardNumber) {
      extracted.cardNumber = parsed.cardNumber.replace(/^0+(?=\d)/, '') || '0';
      extracted.totalNumber = parsed.totalNumber ?? '';
    }
    // setCode — Paddle often misreads on stylized fonts:
    //   `sv6` → `sVb` / `svb` / `5v6`
    //   `sm12` → `5m12` / `sM12`
    // Pre-normalize letters/digits both ways before matching.
    const normalized = allText
      .replace(/\bsvb\b/gi, 'sv6')
      .replace(/\bsv[oO0]\b/gi, 'sv6')
      .replace(/\b5v(\d)/gi, 'sv$1')
      .replace(/\bsu(\d)/gi, 'sv$1');
    const setMatch = normalized.match(/\b(sv\d+[a-z]?|sm\d+[a-z]?|swsh\d+[a-z]?|s\d+[a-z]?)\b/i);
    if (setMatch && !extracted.setCode) {
      extracted.setCode = setMatch[1].toLowerCase();
    }
    if (parsed.setCode && !extracted.setCode) {
      extracted.setCode = parsed.setCode;
    }
    const rarMatch = allText.match(/(?<=^|\s|\/)(SAR|SR|HR|RR|UR|AR|PROMO|C|U|R)(?=\s|$)/);
    if (rarMatch && !extracted.rarity) {
      extracted.rarity = rarMatch[1].toUpperCase();
    }
    if (parsed.rarity && !extracted.rarity) {
      extracted.rarity = parsed.rarity;
    }
  }

  // Bottom-left zoom is now processed BEFORE the bottom-strip block above,
  // so its values are already in `extracted` and the bottom-strip pass only
  // fills gaps. No second pass needed here.

  // Top strip → recover the Korean card name when the full-image pass missed
  // it. Pick the longest 2+ char Hangul/Japanese/Latin token.
  if (!extracted.name && topRes && topRes.lines?.length) {
    const isKo = (s) => /^[가-힣]{2,}$/.test(s.trim());
    const isJa = (s) => /^[぀-ヿ㐀-鿿]{2,}$/.test(s.trim());
    const isEn = (s) => /^[A-Za-z][A-Za-z0-9 .&'’-]{2,}$/.test(s.trim());
    const want = (s) =>
      langHint === 'ko' ? isKo(s) : langHint === 'jp' ? isJa(s) : langHint === 'en' ? isEn(s) : (isKo(s) || isJa(s) || isEn(s));
    const best = [...topRes.lines]
      .filter((l) => want(l.text))
      .sort((a, b) => b.conf - a.conf || b.text.length - a.text.length)[0];
    if (best) extracted.name = best.text.trim();
  }
  return extracted;
}

/**
 * Convert PaddleOCR's per-line output into the same `extracted` shape the
 * Node server expects. We pick the top-most lines as the card name and
 * search the bottom-most lines for `setCode`, `cardNumber/total`, rarity.
 *
 * @param {{ lines: Array<{ text:string, conf:number, box:number[][] }> }} result
 * @param {string} langHint  'ko' | 'jp' | 'en'
 * @param {{ width:number, height:number }} dims
 */
export function paddleToExtracted(result, langHint, dims) {
  if (!result || !Array.isArray(result.lines) || result.lines.length === 0) return null;

  const H = dims?.height ?? 1;
  const lines = result.lines.map((l) => {
    const ys = l.box.map((p) => p[1]);
    const yTop = Math.min(...ys) / H;
    const yBot = Math.max(...ys) / H;
    return { text: l.text, conf: l.conf, yTop, yBot, yMid: (yTop + yBot) / 2 };
  });

  // Bottom-info row sits in the lower 8% of the card on modern sets.
  const bottomLines = lines.filter((l) => l.yMid > 0.90).sort((a, b) => a.yMid - b.yMid);
  const topLines = lines.filter((l) => l.yMid < 0.18).sort((a, b) => a.yMid - b.yMid);

  const bottomText = bottomLines.map((l) => l.text).join(' ');
  // setCode + number/total + rarity from bottom
  const parsed = parseBottomLeft(bottomText);
  const cardNumber = parsed.cardNumber ? parsed.cardNumber.replace(/^0+(?=\d)/, '') || '0' : '';
  const totalNumber = parsed.totalNumber ?? '';
  const setMatch = bottomText.match(/\b(sv\d+[a-z]?|s\d+[a-z]?|sm\d+[a-z]?|swsh\d+[a-z]?)\b/i);
  const setCode = parsed.setCode || (setMatch ? setMatch[1].toLowerCase() : '');
  const rarMatch = bottomText.match(/\b(SAR|SR|HR|RR|UR|AR|PROMO|C|U|R)\b/);
  const rarity = parsed.rarity || (rarMatch ? rarMatch[1] : '');

  // Card name from the largest top-area line that matches the requested language.
  const isKo = (s) => /[가-힣]{2,}/.test(s);
  const isJa = (s) => /[぀-ヿ㐀-鿿]{2,}/.test(s);
  const isEn = (s) => /^[A-Za-z][A-Za-z0-9 .&'’-]{2,}$/.test(s.trim());
  const matchesLang = (s) =>
    langHint === 'ko' ? isKo(s) : langHint === 'jp' ? isJa(s) : langHint === 'en' ? isEn(s) : true;

  const nameCandidates = topLines.filter((l) => matchesLang(l.text) && l.text.trim().length >= 2);
  const name = nameCandidates[0]?.text?.trim() ?? topLines[0]?.text?.trim() ?? '';

  const language =
    langHint || (isKo(name) ? 'ko' : isJa(name) ? 'jp' : isEn(name) ? 'en' : '');

  return {
    name,
    setCode,
    cardNumber,
    totalNumber,
    rarity,
    language,
    rawLines: lines.map((l) => l.text),
  };
}
