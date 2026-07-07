/**
 * PSA 인구 리포트 조회/등록 — 웹 src/lib/psaPop.ts 와 1:1.
 * NAS `/api/psa` 를 호출 — 카드(setCode+번호)에 매핑된 등급별 pop 을 받는다.
 */
import { api } from '@/lib/apiClient';

export interface PsaGradeRow {
  label: string;
  grade: number | null;
  pop: number;
  popQ: number;
}

export interface PsaPop {
  specId: number;
  certNumber: string;
  subject: string;
  brand: string;
  year: string;
  variety: string;
  total: number;
  grades: PsaGradeRow[];
  fetchedAt: string;
}

export type PsaPopResp =
  | { status: 'ok'; pop: PsaPop }
  | { status: 'unmapped' }
  | { status: 'disabled' }
  | { status: 'error'; reason: string };

export async function fetchPsaPop(
  setCode: string,
  cardNumber: string,
  signal?: AbortSignal,
): Promise<PsaPopResp> {
  const qs = new URLSearchParams({ setCode, num: cardNumber });
  try {
    return await api<PsaPopResp>(`/api/psa/pop?${qs.toString()}`, { auth: false, signal });
  } catch {
    return { status: 'unmapped' };
  }
}

export async function registerPsaCert(
  certNumber: string,
  setCode: string,
  cardNumber: string,
): Promise<PsaPopResp> {
  try {
    return await api<PsaPopResp>('/api/psa/register', {
      method: 'POST',
      auth: false,
      body: { certNumber, setCode, num: cardNumber },
    });
  } catch (err) {
    // 레이트리밋(429) 등 — ApiError.body 의 code 를 사유로 노출.
    const code = (err as { body?: { code?: unknown } })?.body?.code;
    return { status: 'error', reason: typeof code === 'string' ? code : 'network' };
  }
}

export const PSA_REGISTER_ERROR_KO: Record<string, string> = {
  'bad-cert': '인증번호 형식이 올바르지 않아요 (숫자 5자리 이상)',
  'no-card-key': '이 카드는 코드 인식이 안 돼 등록할 수 없어요',
  'cert-not-found': 'PSA 에서 해당 인증번호를 찾지 못했어요',
  'number-mismatch': '해당 인증서는 이 카드가 아닌 것 같아요 (카드번호 불일치)',
  'save-failed': '저장에 실패했어요. 잠시 후 다시 시도해주세요',
  network: '네트워크 오류 — 잠시 후 다시 시도해주세요',
  rate_limited: '요청이 너무 많아요. 잠시 후 다시 시도해주세요',
};
