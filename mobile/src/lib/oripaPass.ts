/**
 * 오리파 입장 토큰 — 웹 localStorage 'oripa_pass' 대응(인메모리).
 * 구매 모달이 발급하고 플레이 화면이 소진. URL 직접 진입으로 무료 뽑기
 * UI 를 여는 케이스 차단(실제 결제는 서버 /pull 트랜잭션에서 강제 차감).
 */
interface OripaPass {
  packId: string;
  qty: number;
  ts: number;
}

let pass: OripaPass | null = null;

const TTL_MS = 5 * 60_000;

export function issueOripaPass(packId: string, qty: number) {
  pass = { packId, qty, ts: Date.now() };
}

/** 일치하는 유효 토큰이면 소진하고 true. */
export function consumeOripaPass(packId: string, qty: number): boolean {
  const p = pass;
  pass = null; // 검사 성공/실패와 무관하게 1회용
  if (!p) return false;
  if (Date.now() - p.ts >= TTL_MS) return false;
  return p.packId === packId && p.qty === qty;
}
