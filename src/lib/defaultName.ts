/**
 * 로그인 직후 기본 닉네임 = "트레이너{userId 마지막 6자}".
 * 사용자가 마이페이지에서 수정하기 전까지 사용.
 */
export function defaultNameFor(userId: string | undefined | null): string {
  if (!userId) return '트레이너';
  const short = userId.replace(/-/g, '').slice(-6).toLowerCase();
  return `트레이너${short}`;
}

/**
 * OAuth 원본 이름이 기본값처럼 보이는지(없거나 짧거나) 감지 →
 * "실제 유저가 선택한 닉네임" 없는 상태로 간주해 기본값으로 교체.
 * 현재는 단순히 undefined/빈문자열만 교체하고, 프로필 이름은 무조건 기본값으로 덮음.
 */
export function resolveDisplayName(userId: string, overrideFromDb?: string | null): string {
  if (overrideFromDb && overrideFromDb.trim().length > 0) return overrideFromDb;
  return defaultNameFor(userId);
}
