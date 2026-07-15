/** SEO 공용 상수·헬퍼. metadata / sitemap / JSON-LD 에서 공유. */

export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.poke-30.com';

export const SITE_NAME = '아르보TCG';

/** 절대 URL 로 변환. (이미 절대면 그대로) */
export function absUrl(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** HTML/마크다운 태그 제거 + 공백 정리 후 length 자 이내로 자름. (메타 description 용) */
export function plainExcerpt(raw: string | null | undefined, length = 150): string {
  if (!raw) return '';
  const text = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`>~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).trimEnd()}…`;
}
