/**
 * 포켓몬 카드 도메인 한/영/일 변환 사전.
 * - 스니덩(일본) 검색: translate(text, 'ja')
 * - eBay(영미권) 검색: translate(text, 'en')
 *
 * 정책:
 *   - 공백 기준 토큰 분리 → 사전 룩업 → 없으면 원본 유지
 *   - 카드 코드(예: "SV1-045", "151/165") 같은 비언어 토큰은 자연스럽게 통과
 *   - 완전 자동번역이 아니므로 (대형 신카드 팩 미등재 등) 특정 엔트리는
 *     cardsCatalog 의 override 필드로 수동 교정
 */

interface Term {
  ko: string;
  en?: string;
  ja?: string;
}

/** 포켓몬 이름 (1~2세대 주요 + 인기종) */
const POKEMON: Term[] = [
  { ko: '이상해씨', en: 'bulbasaur',  ja: 'フシギダネ' },
  { ko: '이상해풀', en: 'ivysaur',    ja: 'フシギソウ' },
  { ko: '이상해꽃', en: 'venusaur',   ja: 'フシギバナ' },
  { ko: '파이리',   en: 'charmander', ja: 'ヒトカゲ' },
  { ko: '리자드',   en: 'charmeleon', ja: 'リザード' },
  { ko: '리자몽',   en: 'charizard',  ja: 'リザードン' },
  { ko: '꼬부기',   en: 'squirtle',   ja: 'ゼニガメ' },
  { ko: '어니부기', en: 'wartortle',  ja: 'カメール' },
  { ko: '거북왕',   en: 'blastoise',  ja: 'カメックス' },
  { ko: '피카츄',   en: 'pikachu',    ja: 'ピカチュウ' },
  { ko: '라이츄',   en: 'raichu',     ja: 'ライチュウ' },
  { ko: '이브이',   en: 'eevee',      ja: 'イーブイ' },
  { ko: '뮤',       en: 'mew',        ja: 'ミュウ' },
  { ko: '뮤츠',     en: 'mewtwo',     ja: 'ミュウツー' },
  { ko: '잉어킹',   en: 'magikarp',   ja: 'コイキング' },
  { ko: '갸라도스', en: 'gyarados',   ja: 'ギャラドス' },
  { ko: '미뇽',     en: 'dratini',    ja: 'ミニリュウ' },
  { ko: '신뇽',     en: 'dragonair',  ja: 'ハクリュー' },
  { ko: '망나뇽',   en: 'dragonite',  ja: 'カイリュー' },
  { ko: '메타몽',   en: 'ditto',      ja: 'メタモン' },
  { ko: '푸린',     en: 'jigglypuff', ja: 'プリン' },
  { ko: '푸크린',   en: 'wigglytuff', ja: 'プクリン' },
  { ko: '고라파덕', en: 'golduck',    ja: 'ゴルダック' },
  { ko: '또가스',   en: 'koffing',    ja: 'ドガース' },
  { ko: '프리져',   en: 'articuno',   ja: 'フリーザー' },
  { ko: '썬더',     en: 'zapdos',     ja: 'サンダー' },
  { ko: '파이어',   en: 'moltres',    ja: 'ファイヤー' },
  { ko: '루카리오', en: 'lucario',    ja: 'ルカリオ' },
  { ko: '가디안',   en: 'gardevoir',  ja: 'サーナイト' },
  { ko: '피죤',     en: 'pidgeotto',  ja: 'ピジョン' },
  { ko: '피죤투',   en: 'pidgeot',    ja: 'ピジョット' },
];

/** 카드 기믹/용어 */
const CARD_TERMS: Term[] = [
  { ko: '홀로',      en: 'holo',        ja: 'ホロ' },
  { ko: '홀로그램',  en: 'holographic', ja: 'ホログラム' },
  { ko: '프로모',    en: 'promo',       ja: 'プロモ' },
  { ko: '레어',      en: 'rare',        ja: 'レア' },
  { ko: '레인보우',  en: 'rainbow',     ja: 'レインボー' },
  { ko: '골드',      en: 'gold',        ja: 'ゴールド' },
  { ko: '시크릿',    en: 'secret',      ja: 'シークレット' },
  { ko: '베이스셋',  en: 'base set',    ja: '旧裏' },
  { ko: '진화',      en: 'evolution',   ja: '進化' },
  { ko: '진화형',    en: 'evolution',   ja: '進化' },
  { ko: 'V',         en: 'V',           ja: 'V' },
  { ko: 'VMAX',      en: 'VMAX',        ja: 'VMAX' },
  { ko: 'VSTAR',     en: 'VSTAR',       ja: 'VSTAR' },
  { ko: 'EX',        en: 'EX',          ja: 'EX' },
  { ko: 'ex',        en: 'ex',          ja: 'ex' },
  { ko: 'GX',        en: 'GX',          ja: 'GX' },
  { ko: '포켓몬',    en: 'pokemon',     ja: 'ポケモン' },
  { ko: '포켓몬스터', en: 'pokemon',    ja: 'ポケットモンスター' },
  { ko: '카드',      en: 'card',        ja: 'カード' },
  { ko: '팩',        en: 'pack',        ja: 'パック' },
  { ko: '부스터',    en: 'booster',     ja: 'ブースター' },
  { ko: '박스',      en: 'box',         ja: 'BOX' },
  { ko: '스티커',    en: 'sticker',     ja: 'ステッカー' },
  { ko: '뱃지',      en: 'badge',       ja: 'バッジ' },
  { ko: '배지',      en: 'badge',       ja: 'バッジ' },
  { ko: '프레임',    en: 'frame',       ja: 'フレーム' },
  { ko: '몬스터볼',  en: 'poke ball',   ja: 'モンスターボール' },
];

const ALL: Term[] = [...POKEMON, ...CARD_TERMS];

const MAP_EN: Record<string, string> = Object.fromEntries(
  ALL.filter((t) => t.en).map((t) => [t.ko, t.en!]),
);
const MAP_JA: Record<string, string> = Object.fromEntries(
  ALL.filter((t) => t.ja).map((t) => [t.ko, t.ja!]),
);

export type TranslateTarget = 'en' | 'ja';

/**
 * 공백 토큰화 후 사전 룩업. 미매칭 토큰은 원문 유지.
 * 카드 코드 / 숫자 / 영문 포켓몬 이름이 섞여 있어도 안전하게 통과.
 */
export function translate(text: string, target: TranslateTarget): string {
  if (!text) return text;
  const map = target === 'en' ? MAP_EN : MAP_JA;
  return text
    .trim()
    .split(/\s+/)
    .map((tok) => map[tok] ?? tok)
    .join(' ');
}

/** backward-compat alias (이전 koJaTranslate.ts 대체) */
export const translateKoToJa = (text: string) => translate(text, 'ja');
export const translateKoToEn = (text: string) => translate(text, 'en');
