import { createWorker } from 'tesseract.js';
import sharp from 'sharp';

let workerEng = null;
let workerEngStrict = null; // ASCII-only whitelist for card-info ROIs
let workerEngDigits = null; // digits + slash only — for the number ROI
let workerKor = null;
let workerKorLine = null; // PSM 7 single-line for the title
let workerMulti = null;

async function getWorker(kind) {
  if (kind === 'kor') {
    if (!workerKor) {
      workerKor = await createWorker('kor');
      await workerKor.setParameters({ tessedit_pageseg_mode: '6' });
    }
    return workerKor;
  }
  if (kind === 'multi') {
    if (!workerMulti) {
      try {
        workerMulti = await createWorker('eng+kor+jpn');
      } catch {
        // Some local Tesseract caches may not have Japanese traineddata yet.
        // Keep OCR usable and let English/Korean still run.
        workerMulti = await createWorker('eng+kor');
      }
      await workerMulti.setParameters({ tessedit_pageseg_mode: '6' });
    }
    return workerMulti;
  }
  if (kind === 'eng-strict') {
    if (!workerEngStrict) {
      workerEngStrict = await createWorker('eng');
      await workerEngStrict.setParameters({
        // Only chars that appear on a Pokémon card's bottom-left info row.
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/. ',
        tessedit_pageseg_mode: '6', // Assume single uniform block of text (multi-line)
      });
    }
    return workerEngStrict;
  }
  if (kind === 'eng-digits') {
    if (!workerEngDigits) {
      workerEngDigits = await createWorker('eng');
      await workerEngDigits.setParameters({
        // Only digits + slash. Removes the italic-2→z / 6→a confusions.
        tessedit_char_whitelist: '0123456789/',
        tessedit_pageseg_mode: '7', // Single line — what number-tight is.
      });
    }
    return workerEngDigits;
  }
  if (kind === 'kor-line') {
    if (!workerKorLine) {
      workerKorLine = await createWorker('kor');
      // PSM 8 — single WORD. Empirically the only mode that reads stylized
      // 2-3 char Pokémon TCG titles like "롱스톤". PSM 7 returns empty,
      // PSM 6 hallucinates across multiple imaginary lines.
      await workerKorLine.setParameters({ tessedit_pageseg_mode: '8' });
    }
    return workerKorLine;
  }
  if (!workerEng) {
    workerEng = await createWorker('eng');
    await workerEng.setParameters({ tessedit_pageseg_mode: '6' });
  }
  return workerEng;
}

const CARD_ASPECT = 63 / 88;

const ROI_PRESETS = [
  // Modern Pokémon TCG (sv-series, 2023+) places `set#  num/total  rarity`
  // along the BOTTOM CENTER of the card. The illustrator name sits to the left,
  // copyright to the right. We anchor 3 ROIs around the center, plus one wider
  // bottom-band as fallback for older layouts that put the ID at lower-left.
  // Modern Pokémon TCG bottom info row sits at ~96–99% Y. Layout left→right:
  // `Illus. GOSSAN`, `sv6  009/101  C`, `©2024 Pokémon...`.
  // Two complementary crops: a tight one focused on set# + number, and a
  // wide one that catches the full info line in case ML Kit cropped slightly
  // differently. Threshold disabled (null) — the soft contrast pipe handles
  // light-on-light backgrounds better than binarization.
  { name: 'info-tight', leftPct: 0.08, topPct: 0.955, widthPct: 0.40, heightPct: 0.038, resizeWidth: 3200, threshold: null },
  // Focus only on `009/101 C`. Tesseract handles this much better as one
  // "word" than when the nearby set badge and copyright text are included.
  // Bumped resize 1800→3000 so italic digits (022/063) keep their stroke
  // gaps; at 1800px a thin "6" or "3" closes into "8" after sharpening.
  { name: 'number-tight', leftPct: 0.14, topPct: 0.955, widthPct: 0.22, heightPct: 0.035, resizeWidth: 3000, threshold: null },
  { name: 'info-line',  leftPct: 0.02, topPct: 0.945, widthPct: 0.96, heightPct: 0.055, resizeWidth: 2800, threshold: null },
  // Set badge — small white-on-black box at bottom-left like "m1L".
  // We invert it before OCR so Tesseract sees black-on-white (it can't
  // segment white-on-black reliably). Take a generous band — Tesseract
  // does better with a few px of margin around the small text.
  { name: 'set-badge', leftPct: 0.05, topPct: 0.945, widthPct: 0.10, heightPct: 0.035, resizeWidth: 1800, threshold: null, negate: true },
];

/**
 * Find the real card inside the uploaded frame by looking for strong border
 * gradients near the expected outer edges. The mobile app already crops to a
 * 63:88 guide, but users often leave background inside that guide; this second
 * pass trims the background before ROI OCR.
 *
 * Edge search is restricted to the outer 8% of each side. Older versions
 * searched 0.02–0.28 / 0.72–0.98 and locked onto strong INTERNAL features
 * (top of the illustration frame, divider above the weakness row), chopping
 * off the card name AND the bottom info row entirely. If no real boundary
 * edge is found, return null and let preprocess use the input as-is.
 */
async function detectCardBox(imageBuffer, W, H) {
  const inputAspect = W / H;
  // Mobile app already crops to ~63:88 via the camera guide. When input
  // aspect is already very close, skip detection — any vertical adjustment
  // here risks cropping into the name (top) or info row (bottom).
  if (Math.abs(inputAspect - CARD_ASPECT) / CARD_ASPECT < 0.05) return null;

  const smallW = 360;
  const { data, info } = await sharp(imageBuffer)
    .resize({ width: smallW, withoutEnlargement: true, kernel: sharp.kernel.lanczos3 })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const vx = new Float64Array(w);
  const hy = new Float64Array(h);

  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const i = row + x;
      vx[x] += Math.abs(data[i + 1] - data[i - 1]);
      hy[y] += Math.abs(data[i + w] - data[i - w]);
    }
  }

  const xs = smooth(vx, Math.max(3, Math.round(w * 0.012)));
  const ys = smooth(hy, Math.max(3, Math.round(h * 0.012)));
  // Outer-only search: anything inside the card body is INTERNAL, not the
  // boundary. Keeping these windows tight is what prevents the detector from
  // grabbing the illustration frame or the weakness-row divider.
  const left = strongestEdge(xs, 0.0, 0.08);
  const right = strongestEdge(xs, 0.92, 1.0);
  const top = strongestEdge(ys, 0.0, 0.08);
  const bottom = strongestEdge(ys, 0.92, 1.0);

  if (!left || !right || !top || !bottom) return centeredCardCrop(W, H);

  const boxW = right.index - left.index;
  const boxH = bottom.index - top.index;
  const aspect = boxW / boxH;
  const areaRatio = (boxW * boxH) / (w * h);
  const edgeFloor = (average(xs) + average(ys)) * 0.75;
  const strongEnough = Math.min(left.value, right.value, top.value, bottom.value) > edgeFloor;

  if (
    boxW < w * 0.85 ||
    boxH < h * 0.85 ||
    areaRatio < 0.78 ||
    Math.abs(aspect - CARD_ASPECT) / CARD_ASPECT > 0.10 ||
    !strongEnough
  ) {
    return centeredCardCrop(W, H);
  }

  const padX = Math.round(boxW * 0.004);
  const padY = Math.round(boxH * 0.004);
  const sx = W / w;
  const sy = H / h;
  return clampBox({
    left: Math.round((left.index + padX) * sx),
    top: Math.round((top.index + padY) * sy),
    width: Math.round((boxW - padX * 2) * sx),
    height: Math.round((boxH - padY * 2) * sy),
    method: 'edge',
  }, W, H);
}

function centeredCardCrop(W, H) {
  const aspect = W / H;
  if (Math.abs(aspect - CARD_ASPECT) / CARD_ASPECT < 0.08) return null;
  let cardW;
  let cardH;
  if (aspect > CARD_ASPECT) {
    cardH = Math.round(H * 0.96);
    cardW = Math.round(cardH * CARD_ASPECT);
  } else {
    cardW = Math.round(W * 0.96);
    cardH = Math.round(cardW / CARD_ASPECT);
  }
  return {
    left: Math.round((W - cardW) / 2),
    top: Math.round((H - cardH) / 2),
    width: cardW,
    height: cardH,
    method: 'center',
  };
}

export async function preprocess(imageBuffer) {
  const meta = await sharp(imageBuffer).metadata();
  const W = meta.width ?? 1200;
  const H = meta.height ?? 1680;

  const detectedBox = await detectCardBox(imageBuffer, W, H);
  const extractBox = detectedBox ? withoutMethod(detectedBox) : null;
  const card = extractBox
    ? await sharp(imageBuffer).extract(extractBox).normalize().toBuffer()
    : await sharp(imageBuffer).normalize().toBuffer();
  const cardMeta = await sharp(card).metadata();
  const cardW = cardMeta.width ?? W;
  const cardH = cardMeta.height ?? H;

  const rois = [];
  for (const p of ROI_PRESETS) {
    const left = clamp(Math.round(cardW * p.leftPct), 0, cardW - 4);
    const top = clamp(Math.round(cardH * p.topPct), 0, cardH - 4);
    const width = clamp(Math.round(cardW * p.widthPct), 4, cardW - left);
    const height = clamp(Math.round(cardH * p.heightPct), 4, cardH - top);
    const resizeWidth = p.resizeWidth ?? 2400;
    // p.threshold === null  → skip binarization entirely (rely on contrast).
    // p.threshold === undefined → fall back to 158 (legacy default).
    const useThreshold = p.threshold !== null;
    const thresholdVal = p.threshold ?? 158;
    // Three variants per ROI:
    //   - hard: high contrast + (optional) threshold for crisp bg
    //   - soft: mild contrast amp; works on textured/cardboard bg
    //   - raw : grayscale+normalize ONLY. Stylized italic digits like "022/063"
    //           lose loop closure under .linear(1.7,-50), so 6→8 / 3→8.
    //           The raw variant preserves stroke gaps Tesseract uses to
    //           disambiguate similar digits.
    // p.negate=true flips white-on-black badges to black-on-white BEFORE the
    // contrast pass — Tesseract can't segment white text on black.
    const baseExtract = (pipe) => {
      let p2 = pipe.extract({ left, top, width, height })
        .resize({ width: resizeWidth, kernel: sharp.kernel.lanczos3 })
        .grayscale();
      if (p.negate) p2 = p2.negate();
      return p2.normalize();
    };
    let hardPipe = baseExtract(sharp(card))
      .sharpen({ sigma: 1.4, m1: 0.5, m2: 1.0 })
      .linear(1.7, -50);
    if (useThreshold) hardPipe = hardPipe.threshold(thresholdVal);
    const buf = await hardPipe.toBuffer();
    const softBuf = await baseExtract(sharp(card))
      .sharpen({ sigma: 1.0, m1: 0.4, m2: 0.8 })
      .linear(1.35, -25)
      .toBuffer();
    const rawBuf = await baseExtract(sharp(card)).toBuffer();
    rois.push({ name: p.name, buf, softBuf, rawBuf, box: { left, top, width, height } });
  }

  // Tight crop around the card-name title only — exclude the evolution badge,
  // type icon, and HP block on the sides. A 13%-tall crop swept up too much
  // background art and confused Tesseract. Width tightened from 62%→48% so
  // Tesseract isn't fed half a row of empty beige to the right of "롱스톤".
  const tnLeft = Math.round(cardW * 0.12);
  const tnTop = Math.round(cardH * 0.018);
  const tnW = Math.round(cardW * 0.48);
  const tnH = Math.round(cardH * 0.062);
  const topName = await sharp(card)
    .extract({ left: tnLeft, top: tnTop, width: tnW, height: tnH })
    .resize({ width: 1600, kernel: sharp.kernel.lanczos3 })
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1.2, m1: 0.4, m2: 0.8 })
    .toBuffer();

  const fullText = await sharp(card)
    .resize({ width: 1800, kernel: sharp.kernel.lanczos3 })
    .normalize()
    .sharpen({ sigma: 0.8, m1: 0.3, m2: 0.6 })
    .toBuffer();

  return { card, rois, topName, fullText, dims: { W, H, cardW, cardH, detectedBox } };
}

/** ASCII-only OCR for card-info ROIs (bottom-left).
 *  whitelist drops Tesseract's tendency to hallucinate punctuation/Korean.
 *  Tries PSM 6 (block) and PSM 11 (sparse) — concatenates both because
 *  small stylized text behaves differently across PSMs. */
export async function ocrAscii(buf, psm = '7') {
  // PSM 7 = single line of text, the right setting for the bottom info row.
  // PSM 6 (block) was treating the line as a paragraph and over-segmenting.
  const w = await getWorker('eng-strict');
  await w.setParameters({ tessedit_pageseg_mode: psm });
  const { data } = await w.recognize(buf);
  return data.text ?? '';
}

/** Digit + slash only — used for the number-tight ROI. */
export async function ocrDigits(buf, psm = '7') {
  const w = await getWorker('eng-digits');
  await w.setParameters({ tessedit_pageseg_mode: psm });
  const { data } = await w.recognize(buf);
  return data.text ?? '';
}

export async function ocrAsciiVariants(roi) {
  // Run line/block passes plus a single-word pass. The number crop often reads
  // correctly with PSM 8 while PSM 6/7 miss the tiny italic digits.
  // For number-tight we also run a digits-only pass on the raw (un-contrasted)
  // buffer — italic 2/6/3 keep their loops open at full resolution and the
  // narrow whitelist prevents Tesseract from emitting "z"/"a"/"o".
  const tasks = [
    ocrAscii(roi.buf, '7'),
    ocrAscii(roi.softBuf, '6'),
    ocrAscii(roi.softBuf, '8'),
    ocrAscii(roi.rawBuf ?? roi.softBuf, '7'),
  ];
  if (roi.name === 'number-tight') {
    // Empirically PSM 8 on the soft buf is the only mode that recovers the
    // leading "0" of "063" — without it we get "088" from PSM 7. Run multiple
    // PSMs and let the parser score them.
    tasks.push(ocrDigits(roi.softBuf, '8'));
    tasks.push(ocrDigits(roi.softBuf, '13'));
    tasks.push(ocrDigits(roi.softBuf, '7'));
  }
  const results = await Promise.all(tasks);
  return results.join('\n');
}

export async function ocrEng(buf) {
  const w = await getWorker('eng');
  const { data } = await w.recognize(buf);
  return data.text ?? '';
}

export async function ocrKor(buf) {
  // Use the single-line Korean worker — the title is one line. PSM 6 (default
  // 'kor' worker) was treating "롱스톤" as a multi-line block and emitting
  // "이라했스자분난" — totally hallucinated.
  const w = await getWorker('kor-line');
  const { data } = await w.recognize(buf);
  return data.text ?? '';
}

export async function ocrMulti(buf) {
  const w = await getWorker('multi');
  const { data } = await w.recognize(buf);
  return data.text ?? '';
}

/** Run Korean + English OCR in parallel on the card-name ROI.
 *  Multi-language and full-card OCR are skipped — they were the slowest
 *  passes and rarely beat the per-language workers on the top-name crop. */
export async function ocrBoth(buf, _fullTextBuf = null) {
  const [eng, kor] = await Promise.all([
    ocrEng(buf),
    ocrKor(buf),
  ]);
  return { eng: eng ?? '', kor: kor ?? '', multi: '', full: '' };
}

/** Run only the worker matching the user-selected language. Much faster
 *  than ocrBoth and far less prone to cross-language hallucination. */
export async function ocrName(buf, language) {
  switch (language) {
    case 'en':
      return { eng: await ocrEng(buf), kor: '', multi: '', full: '' };
    case 'jp':
      return { eng: '', kor: '', multi: await ocrMulti(buf), full: '' };
    case 'ko':
      return { eng: '', kor: await ocrKor(buf), multi: '', full: '' };
    default:
      return ocrBoth(buf);
  }
}

export async function shutdown() {
  if (workerEng) await workerEng.terminate();
  if (workerEngStrict) await workerEngStrict.terminate();
  if (workerEngDigits) await workerEngDigits.terminate();
  if (workerKor) await workerKor.terminate();
  if (workerKorLine) await workerKorLine.terminate();
  if (workerMulti) await workerMulti.terminate();
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function smooth(values, radius) {
  const out = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) {
    let total = 0;
    let count = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(values.length - 1, i + radius); j++) {
      total += values[j];
      count++;
    }
    out[i] = total / Math.max(1, count);
  }
  return out;
}

function strongestEdge(values, fromPct, toPct) {
  const from = Math.max(0, Math.floor(values.length * fromPct));
  const to = Math.min(values.length - 1, Math.ceil(values.length * toPct));
  let best = null;
  for (let i = from; i <= to; i++) {
    if (!best || values[i] > best.value) best = { index: i, value: values[i] };
  }
  return best;
}

function average(values) {
  let total = 0;
  for (const v of values) total += v;
  return total / Math.max(1, values.length);
}

function clampBox(box, W, H) {
  const left = clamp(box.left, 0, W - 8);
  const top = clamp(box.top, 0, H - 8);
  const width = clamp(box.width, 8, W - left);
  const height = clamp(box.height, 8, H - top);
  return { ...box, left, top, width, height };
}

function withoutMethod(box) {
  const { left, top, width, height } = box;
  return { left, top, width, height };
}
