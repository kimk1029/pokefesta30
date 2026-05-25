import { POKEMON_KO_TO_JA } from './pokemonNamesKoJa';

/**
 * 한국어 검색어 → 일본어 표기 변환 (snkrdunk 검색용).
 *
 * PokeAPI 전 1025종(POKEMON_KO_TO_JA) + KR/JP 공식 표기가 다르거나 구어체라
 * 자동 사전에 없는 트레이너/별칭 + 자주 쓰는 카드 용어를 합쳐 매핑한다.
 * 웹 `src/lib/cardTranslate.ts` 의 KO→JA 매핑(POKEMON + CHARACTERS)과 정렬.
 */

/** KR/JP 표기가 다르거나 구어체라 종족 사전에 없는 별칭. (웹 CHARACTERS 와 동기화) */
const EXTRA_KO_TO_JA: Record<string, string> = {
  // 트레이너/등장인물 — KR/JP 표기 상이
  명희: 'メイ',
  메이: 'メイ',
  휴이: 'キョウヘイ',
  모란: 'ナンジャモ',
  난천: 'シロナ',
  풀잎: 'ナタネ',
  단지: 'デンジ',
  태홍: 'アカギ',
  진철: 'シンジ',
  미카: 'カトレア',
  벨라: 'ベル',
  체렌: 'チェレン',
  스즈나: 'スズナ',
  미스즈: 'ミタル',
  리리에: 'リーリエ',
  구즈마: 'グズマ',
  루자미네: 'ルザミーネ',
  구라이브: 'グラジオ',
  페퍼: 'ペパー',
  아오키: 'アオキ',
  보탄: 'ボタン',
  하사크: 'ハッサク',
  // 클래식 트레이너 + 구어체 별칭 (snkrdunk 트레이너/구판 카드 검색용)
  이슬이: 'カスミ', // Misty
  비주기: 'サカキ', // Giovanni
  냐옹: 'ニャース', // Meowth 구어체 (공식명 '나옹'은 종족 사전)
  로켓단: 'ロケット団',
  한지우: 'サトシ', // Ash
  // 관동 체육관 관장
  마티스: 'マチス', // Lt. Surge
  민화: 'エリカ', // Erika
  독수: 'キョウ', // Koga
  강연: 'カツラ', // Blaine
  초련: 'ナツメ', // Sabrina
  // 애니 로켓단 삼인방 + 라이벌/동료
  로사: 'ムサシ', // Jessie
  로이: 'コジロウ', // James
  웅: 'タケシ', // Brock
  오바람: 'シゲル', // Gary
  봄이: 'ハルカ', // May
  빛나: 'ヒカリ', // Dawn
  세레나: 'セレナ', // Serena
  고우: 'ゴウ', // Goh
  // 챔피언 / 빌런 두목 / 박사
  목호: 'ワタル', // Lance
  단델: 'ダンデ', // Leon
  게치스: 'ゲーチス', // Ghetsis
  플라드리: 'フラダリ', // Lysandre
  오박사: 'オーキド', // Prof. Oak
  // 빌런 두목
  마적: 'マツブサ', // Maxie (마그마단)
  아강: 'アオギリ', // Archie (아쿠아단)
  로즈: 'ローズ', // Rose (마크로코스모스)
  // 챔피언
  윤진: 'ミクリ', // Wallace (호연 챔피언/루네 관장)
  노간주: 'アデク', // Alder
  백연: 'カルネ', // Diantha
  네모: 'ネモ', // Nemona
  // 칼로스/하나/알로라 동료·캡틴
  시트론: 'シトロン', // Clemont
  유리카: 'ユリーカ', // Bonnie
  아이리스: 'アイリス', // Iris
  덴트: 'デント', // Cilan
  마오: 'マオ', // Mallow
  스이렌: 'スイレン', // Lana
  카키: 'カキ', // Kiawe
  마마네: 'マーマネ', // Sophocles
  코하루: 'コハル', // Chloe
  // 성도 체육관 관장
  비상: 'ハヤト', // Falkner
  호일: 'ツクシ', // Bugsy
  꼭두: 'アカネ', // Whitney
  유빈: 'マツバ', // Morty
  사도: 'シジマ', // Chuck
  규리: 'ミカン', // Jasmine
  류옹: 'ヤナギ', // Pryce
  이향: 'イブキ', // Clair
  // 호연 체육관 관장 + 챔피언
  원규: 'ツツジ', // Roxanne
  철구: 'トウキ', // Brawly
  암페어: 'テッセン', // Wattson
  민지: 'アスナ', // Flannery
  종길: 'センリ', // Norman
  은송: 'ナギ', // Winona
  아단: 'アダン', // Juan
  성호: 'ダイゴ', // Steven
  // 신오 체육관 관장
  강석: 'ヒョウタ', // Roark
  유채: 'ナタネ', // Gardenia
  자두: 'スモモ', // Maylene
  맥실러: 'マキシ', // Crasher Wake
  멜리사: 'メリッサ', // Fantina
  동골: 'トウガン', // Byron
  // 자주 쓰는 카드 용어
  메가: 'メガ',
  카드게임: 'カードゲーム',
  카드: 'カード',
  프로모: 'プロモ',
};

// 종족 사전(전수) + 별칭(override) 병합. 긴 키부터 매칭해 부분어 충돌 방지.
const MAP: Record<string, string> = { ...POKEMON_KO_TO_JA, ...EXTRA_KO_TO_JA };
const KEYS = Object.keys(MAP).sort((a, b) => b.length - a.length);

/**
 * 검색어의 알려진 한국어 토큰을 일본어 표기로 치환. 모르는 부분은 원형 유지.
 * 예) "비주기" → "サカキ", "리자몽ex" → "リザードンex", "메가리자몽" → "メガリザードン".
 */
export function koToJaSearch(text: string): string {
  let out = (text ?? '').trim();
  if (!out) return out;
  for (const k of KEYS) {
    if (out.includes(k)) out = out.split(k).join(MAP[k]);
  }
  return out;
}
