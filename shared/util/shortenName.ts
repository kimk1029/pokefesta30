/**
 * 카드명 축약 — 웹·모바일·NAS 서버 공유 단일 소스.
 * "이름 | 부제" 형태에서 부제를 떼고 maxLen 초과 시 말줄임.
 * (기본 22자 — 카드 타일/리스트 공통. 넓은 그리드는 maxLen 을 넘겨 조절.)
 */
export function shortenName(name: string, maxLen = 22): string {
  const cut = name.split(/[|｜]/)[0].trim();
  return cut.length > maxLen ? `${cut.slice(0, maxLen - 1)}…` : cut;
}
