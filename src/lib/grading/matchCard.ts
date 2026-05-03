/**
 * OCR 결과 → CARDS_CATALOG 매칭.
 *
 * 매칭 우선순위 (점수 합산):
 *   - setCode 일치     +50
 *   - cardNumber 좌측 일치 +40
 *   - matchNames 키워드 raw text 에 포함 +30 (가장 긴 키워드 한 개)
 *
 * threshold 30 미만이면 null 반환.
 */

import type { CardOcrResult } from '@/components/grading/cardOcr';
import { CARDS_CATALOG, type CardCatalogEntry } from '../cardsCatalog';

export interface CardMatch {
  entry: CardCatalogEntry;
  /** 0..100. 매칭 신뢰도. UI 에서 "확실 / 추측" 분기에 사용. */
  confidence: number;
  /** 어떤 신호가 매칭에 기여했는지 디버그/UI 표시용. */
  reasons: string[];
}

const MATCH_THRESHOLD = 30;

export function matchCardFromOcr(ocr: CardOcrResult): CardMatch | null {
  const haystack = (ocr.rawText || '').toLowerCase();
  const setCode = (ocr.setCode || ocr.promoCode || '').toUpperCase();
  const cardNumLeft = ocr.cardNumber?.left ?? '';

  let best: CardMatch | null = null;

  for (const entry of CARDS_CATALOG) {
    let score = 0;
    const reasons: string[] = [];

    if (entry.setCode && setCode && entry.setCode.toUpperCase() === setCode) {
      score += 50;
      reasons.push(`세트 ${setCode}`);
    }

    if (
      entry.cardNumber &&
      cardNumLeft &&
      stripLeadingZeros(entry.cardNumber) === stripLeadingZeros(cardNumLeft)
    ) {
      score += 40;
      reasons.push(`번호 ${cardNumLeft}`);
    }

    const nameHit = (entry.matchNames ?? [])
      .map((n) => n.toLowerCase().trim())
      .filter((n) => n.length > 0 && haystack.includes(n))
      .sort((a, b) => b.length - a.length)[0];
    if (nameHit) {
      score += 30;
      reasons.push(`이름 "${nameHit}"`);
    }

    if (score < MATCH_THRESHOLD) continue;
    if (!best || score > best.confidence) {
      best = { entry, confidence: Math.min(score, 100), reasons };
    }
  }

  return best;
}

function stripLeadingZeros(s: string): string {
  return s.replace(/^0+/, '') || '0';
}
