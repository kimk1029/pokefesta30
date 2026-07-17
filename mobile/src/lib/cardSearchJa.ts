/**
 * 한국어 검색어 → 일본어 표기 변환 (snkrdunk 검색용) — 오프라인 폴백.
 *
 * 사전·엔진은 [[/shared/cardTranslate.ts]] 단일 매퍼를 그대로 사용한다
 * (웹·NAS 서버 /api/card-lang 과 동일 엔진·동일 결과). 온라인일 때는
 * cardLang.ts 가 서버를 호출하고, 이 함수는 네트워크 실패 시에만 쓰인다.
 */
import { translate } from '../../../shared/cardTranslate';

export function koToJaSearch(text: string): string {
  const q = (text ?? '').trim();
  if (!q) return q;
  return translate(q, 'ja');
}
