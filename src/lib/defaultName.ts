/**
 * 로그인 직후 기본 닉네임 = "트레이너{userId 마지막 6자}".
 * 사용자가 마이페이지에서 수정하기 전까지 사용.
 */
export function defaultNameFor(userId: string | undefined | null): string {
  if (!userId) return '트레이너';
  const short = userId.replace(/-/g, '').slice(-6).toLowerCase();
  return `트레이너${short}`;
}
