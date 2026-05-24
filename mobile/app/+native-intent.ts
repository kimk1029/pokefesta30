/**
 * expo-router 의 deep-link 경로 정규화 훅. 모든 incoming 딥링크가 라우팅되기
 * "전에" 여기서 path 를 변환할 수 있다.
 *
 * 문제: 서버가 OAuth 성공 시 pokefesta30://auth?token=<jwt> 로 redirect 하는데,
 * 커스텀 스킴의 host("auth") 처리가 들쭉날쭉해 expo-router 가 /auth 로 매칭하지
 * 못하고 +not-found 로 떨어진다 → 404.
 *
 * 해결: token= 이 들어있는 어떤 딥링크든 명시적으로 `/auth?token=…` 경로로
 * 재작성해 app/auth.tsx 가 확실히 매칭되도록 한다.
 */
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    if (path && path.includes('token=')) {
      const i = path.indexOf('token=');
      const raw = path.slice(i + 'token='.length).split('&')[0].split('#')[0];
      if (raw) return `/auth?token=${raw}`;
    }
  } catch {
    // 변환 실패 시 원본 경로 유지.
  }
  return path;
}
