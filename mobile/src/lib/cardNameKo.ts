/**
 * Snkrdunk 일본어 카드명 → 한국어 표시 — 오프라인 폴백.
 *
 * 사전·엔진은 [[/shared/cardTranslate.ts]] 단일 매퍼를 그대로 사용한다
 * (웹·NAS 서버 /api/card-lang 과 동일 엔진·동일 결과). 작품별 사전(포켓몬·원피스)
 * 역방향 + 상태·상품 용어 + 잔여 가나 음역 폴백까지 shared 엔진이 처리한다.
 * 온라인일 때는 cardLang.ts 가 서버를 호출하고, 이 함수는 폴백 전용.
 */
import { translateKnownCardNameToKo } from '../../../shared/cardTranslate';

export function localizeCardName(input: string | null | undefined): string {
  if (!input) return '';
  return translateKnownCardNameToKo(String(input));
}
