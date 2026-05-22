/**
 * 포켓몬 카드 도메인 한/영/일 변환 사전.
 * - 스니덩(일본) 검색: translate(text, 'ja')
 * - eBay(영미권) 검색: translate(text, 'en')
 *
 * 정책:
 *   - 공백 기준 토큰 분리 → 사전 룩업 → 없으면 원본 유지
 *   - 대소문자 무시 매칭 (SAR / sar / Sar 모두 동일 처리)
 *   - 카드 코드(예: "SV1-045", "151/165") 같은 비언어 토큰은 자연스럽게 통과
 *   - 사전에 없는 포켓몬명은 원문 유지 → 필요한 이름만 추가
 */

interface Term {
  ko: string;
  en?: string;
  ja?: string;
}

/** 포켓몬 이름 — 한국 포켓몬 카드에 자주 등장하는 종 중심. 알파벳 기준 정렬. */
const POKEMON: Term[] = [
  // 1세대 스타터
  { ko: '이상해씨',  en: 'bulbasaur',   ja: 'フシギダネ' },
  { ko: '이상해풀',  en: 'ivysaur',     ja: 'フシギソウ' },
  { ko: '이상해꽃',  en: 'venusaur',    ja: 'フシギバナ' },
  { ko: '파이리',    en: 'charmander',  ja: 'ヒトカゲ' },
  { ko: '리자드',    en: 'charmeleon',  ja: 'リザード' },
  { ko: '리자몽',    en: 'charizard',   ja: 'リザードン' },
  { ko: '꼬부기',    en: 'squirtle',    ja: 'ゼニガメ' },
  { ko: '어니부기',  en: 'wartortle',   ja: 'カメール' },
  { ko: '거북왕',    en: 'blastoise',   ja: 'カメックス' },
  // 1세대 인기
  { ko: '피카츄',    en: 'pikachu',     ja: 'ピカチュウ' },
  { ko: '라이츄',    en: 'raichu',      ja: 'ライチュウ' },
  { ko: '뮤',        en: 'mew',         ja: 'ミュウ' },
  { ko: '뮤츠',      en: 'mewtwo',      ja: 'ミュウツー' },
  { ko: '잉어킹',    en: 'magikarp',    ja: 'コイキング' },
  { ko: '갸라도스',  en: 'gyarados',    ja: 'ギャラドス' },
  { ko: '미뇽',      en: 'dratini',     ja: 'ミニリュウ' },
  { ko: '신뇽',      en: 'dragonair',   ja: 'ハクリュー' },
  { ko: '망나뇽',    en: 'dragonite',   ja: 'カイリュー' },
  { ko: '메타몽',    en: 'ditto',       ja: 'メタモン' },
  { ko: '푸린',      en: 'jigglypuff',  ja: 'プリン' },
  { ko: '푸크린',    en: 'wigglytuff',  ja: 'プクリン' },
  { ko: '고라파덕',  en: 'golduck',     ja: 'ゴルダック' },
  { ko: '또가스',    en: 'koffing',     ja: 'ドガース' },
  { ko: '모다피',    en: 'gloom',       ja: 'クサイハナ' },
  { ko: '잠만보',    en: 'snorlax',     ja: 'カビゴン' },
  { ko: '식스테일',  en: 'vulpix',      ja: 'ロコン' },
  { ko: '나인테일',  en: 'ninetales',   ja: 'キュウコン' },
  { ko: '알로라 식스테일', en: 'alolan vulpix',  ja: 'アローラロコン' },
  { ko: '알로라 나인테일', en: 'alolan ninetales', ja: 'アローラキュウコン' },
  // 1세대 전설
  { ko: '프리져',    en: 'articuno',    ja: 'フリーザー' },
  { ko: '썬더',      en: 'zapdos',      ja: 'サンダー' },
  { ko: '파이어',    en: 'moltres',     ja: 'ファイヤー' },
  // 이브이 8형제 — 카드시장 최고 인기
  { ko: '이브이',    en: 'eevee',       ja: 'イーブイ' },
  { ko: '샤미드',    en: 'vaporeon',    ja: 'シャワーズ' },
  { ko: '쥬피썬더',  en: 'jolteon',     ja: 'サンダース' },
  { ko: '부스터',    en: 'flareon',     ja: 'ブースター' },
  { ko: '에브이',    en: 'eevee',       ja: 'イーブイ' },
  { ko: '에피',      en: 'espeon',      ja: 'エーフィ' },
  { ko: '블래키',    en: 'umbreon',     ja: 'ブラッキー' },
  { ko: '리피아',    en: 'leafeon',     ja: 'リーフィア' },
  { ko: '글레이시아', en: 'glaceon',    ja: 'グレイシア' },
  { ko: '님피아',    en: 'sylveon',     ja: 'ニンフィア' },
  // 2세대 전설 / 인기
  { ko: '루기아',    en: 'lugia',       ja: 'ルギア' },
  { ko: '칠색조',    en: 'ho-oh',       ja: 'ホウオウ' },
  { ko: '세레비',    en: 'celebi',      ja: 'セレビィ' },
  { ko: '수쿠모',    en: 'scizor',      ja: 'ハッサム' },
  // 3세대
  { ko: '나무지기',  en: 'treecko',     ja: 'キモリ' },
  { ko: '나무킹',    en: 'sceptile',    ja: 'ジュカイン' },
  { ko: '아차모',    en: 'torchic',     ja: 'アチャモ' },
  { ko: '번치코',    en: 'blaziken',    ja: 'バシャーモ' },
  { ko: '물짱이',    en: 'mudkip',      ja: 'ミズゴロウ' },
  { ko: '대짱이',    en: 'swampert',    ja: 'ラグラージ' },
  { ko: '카이오가',  en: 'kyogre',      ja: 'カイオーガ' },
  { ko: '그란돈',    en: 'groudon',     ja: 'グラードン' },
  { ko: '레쿠쟈',    en: 'rayquaza',    ja: 'レックウザ' },
  { ko: '라티오스',  en: 'latios',      ja: 'ラティオス' },
  { ko: '라티아스',  en: 'latias',      ja: 'ラティアス' },
  { ko: '지라치',    en: 'jirachi',     ja: 'ジラーチ' },
  { ko: '데오키시스', en: 'deoxys',     ja: 'デオキシス' },
  // 4세대
  { ko: '디아루가',  en: 'dialga',      ja: 'ディアルガ' },
  { ko: '펄기아',    en: 'palkia',      ja: 'パルキア' },
  { ko: '기라티나',  en: 'giratina',    ja: 'ギラティナ' },
  { ko: '아르세우스', en: 'arceus',     ja: 'アルセウス' },
  { ko: '루카리오',  en: 'lucario',     ja: 'ルカリオ' },
  { ko: '가디안',    en: 'gardevoir',   ja: 'サーナイト' },
  { ko: '피죤',      en: 'pidgeotto',   ja: 'ピジョン' },
  { ko: '피죤투',    en: 'pidgeot',     ja: 'ピジョット' },
  { ko: '링곰',      en: 'ursaring',    ja: 'リングマ' },
  // 5세대
  { ko: '레시라무',  en: 'reshiram',    ja: 'レシラム' },
  { ko: '제크로무',  en: 'zekrom',      ja: 'ゼクロム' },
  { ko: '큐레무',    en: 'kyurem',      ja: 'キュレム' },
  { ko: '제라오라',  en: 'zeraora',     ja: 'ゼラオラ' },
  // 6세대
  { ko: '젤네아스',  en: 'xerneas',     ja: 'ゼルネアス' },
  { ko: '이벨타르',  en: 'yveltal',     ja: 'イベルタル' },
  { ko: '지가르데',  en: 'zygarde',     ja: 'ジガルデ' },
  { ko: '동미르',    en: 'goomy',       ja: 'ヌメラ' },
  // 7세대
  { ko: '솔가레오',  en: 'solgaleo',    ja: 'ソルガレオ' },
  { ko: '루나아라',  en: 'lunala',      ja: 'ルナアーラ' },
  { ko: '네크로즈마', en: 'necrozma',   ja: 'ネクロズマ' },
  { ko: '마기아나',  en: 'magearna',    ja: 'マギアナ' },
  // 8세대
  { ko: '자시안',    en: 'zacian',      ja: 'ザシアン' },
  { ko: '자마젠타',  en: 'zamazenta',   ja: 'ザマゼンタ' },
  { ko: '무한다이노', en: 'eternatus',  ja: 'ムゲンダイナ' },
  { ko: '바크스',    en: 'bounsweet',   ja: 'アマカジ' },
  { ko: '우라오스',  en: 'urshifu',     ja: 'ウーラオス' },
  { ko: '레지기가스', en: 'regigigas',  ja: 'レジギガス' },
  // 9세대
  { ko: '코라이돈',  en: 'koraidon',    ja: 'コライドン' },
  { ko: '미라이돈',  en: 'miraidon',    ja: 'ミライドン' },
  { ko: '테라파고스', en: 'terapagos',  ja: 'テラパゴス' },
  { ko: '세이콜',    en: 'ceruledge',   ja: 'ソウブレイズ' },
  { ko: '센터',      en: 'armarouge',   ja: 'グレンアルマ' },
];

/** 카드 기믹/용어 + 레어도 약어. 모두 대소문자 무시로 매칭. */
const CARD_TERMS: Term[] = [
  // 속성·일반 용어
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

  // 레어도 약어 — 한일영 모두 동일 사용 (대소문자 정규화)
  { ko: 'SAR',  en: 'SAR',  ja: 'SAR'  }, // Special Art Rare
  { ko: 'AR',   en: 'AR',   ja: 'AR'   }, // Art Rare
  { ko: 'SR',   en: 'SR',   ja: 'SR'   }, // Super Rare
  { ko: 'UR',   en: 'UR',   ja: 'UR'   }, // Ultra Rare
  { ko: 'HR',   en: 'HR',   ja: 'HR'   }, // Hyper Rare
  { ko: 'CHR',  en: 'CHR',  ja: 'CHR'  }, // Character Rare
  { ko: 'CSR',  en: 'CSR',  ja: 'CSR'  }, // Character Super Rare
  { ko: 'IR',   en: 'IR',   ja: 'IR'   }, // Illustration Rare
  { ko: 'TR',   en: 'TR',   ja: 'TR'   }, // Training Rare
  { ko: 'PSA10', en: 'PSA 10', ja: 'PSA10' },
  { ko: 'PSA9',  en: 'PSA 9',  ja: 'PSA9'  },

  // 시리즈 표기 (그대로)
  { ko: 'V',     en: 'V',     ja: 'V'     },
  { ko: 'VMAX',  en: 'VMAX',  ja: 'VMAX'  },
  { ko: 'VSTAR', en: 'VSTAR', ja: 'VSTAR' },
  { ko: 'EX',    en: 'EX',    ja: 'EX'    },
  { ko: 'ex',    en: 'ex',    ja: 'ex'    },
  { ko: 'GX',    en: 'GX',    ja: 'GX'    },
  { ko: 'V-UNION', en: 'V-UNION', ja: 'V-UNION' },

  // 포켓몬/상품
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

/** 사전을 lowercase key → value 로 빌드해서 대소문자 무시 매칭 */
const MAP_EN: Record<string, string> = Object.fromEntries(
  ALL.filter((t) => t.en).map((t) => [t.ko.toLowerCase(), t.en!]),
);
const MAP_JA: Record<string, string> = Object.fromEntries(
  ALL.filter((t) => t.ja).map((t) => [t.ko.toLowerCase(), t.ja!]),
);
const JA_TO_KO: Array<[string, string]> = ALL
  .filter((t) => t.ja)
  .map((t) => [t.ja!, t.ko] as [string, string])
  .sort((a, b) => b[0].length - a[0].length);

const CARD_NAME_PHRASES: Array<[RegExp, string]> = [
  [/ポケモンカードゲーム/g, '포켓몬 카드 게임'],
  [/強化拡張パック/g, '강화 확장팩'],
  [/ハイクラスパック/g, '하이클래스팩'],
  [/拡張パック/g, '확장팩'],
  [/デッキビルドBOX/g, '덱 빌드 BOX'],
  [/ポケモンセンターセット/g, '포켓몬센터 세트'],
  [/スカーレット&バイオレット/g, '스칼렛&바이올렛'],
  [/スカーレット＆バイオレット/g, '스칼렛&바이올렛'],
  [/テラスタルフェスex/g, '테라스탈 페스티벌 ex'],
  [/アビスアイ/g, '어비스아이'],
  [/ニンジャスピナー/g, '닌자 스피너'],
  [/ムニキスゼロ/g, '무니키스 제로'],
  [/MEGAドリームex/g, 'MEGA 드림 ex'],
  [/インフェルノX/g, '인페르노 X'],
  [/メガシンフォニア/g, '메가심포니아'],
  [/メガブレイブ/g, '메가브레이브'],
  [/ホワイトフレア/g, '화이트플레어'],
  [/ブラックボルト/g, '블랙볼트'],
  [/ロケット団の栄光/g, '로켓단의 영광'],
  [/熱風のアリーナ/g, '열풍의 아리나'],
  [/バトルパートナーズ/g, '배틀 파트너즈'],
  [/超電ブレイカー/g, '슈퍼일렉트릭 브레이커'],
  [/楽園ドラゴーナ/g, '낙원 드라고나'],
  [/ステラミラクル/g, '스텔라 미라클'],
  [/ナイトワンダラー/g, '나이트 원더러'],
  [/変幻の仮面/g, '변환의 가면'],
  [/クリムゾンヘイズ/g, '크림슨 헤이즈'],
  [/サイバージャッジ/g, '사이버 저지'],
  [/ワイルドフォース/g, '와일드 포스'],
  [/シャイニートレジャーex/g, '샤이니 트레저 ex'],
  [/未来の一閃/g, '미래의 일섬'],
  [/古代の咆哮/g, '고대의 포효'],
  [/レイジングサーフ/g, '레이징 서프'],
  [/黒炎の支配者/g, '흑염의 지배자'],
  [/ポケモンカード151/g, '포켓몬 카드 151'],
  [/クレイバースト/g, '클레이버스트'],
  [/スノーハザード/g, '스노해저드'],
  [/トリプレットビート/g, '트리플렛 비트'],
  [/バイオレットex/g, '바이올렛 ex'],
  [/スカーレットex/g, '스칼렛 ex'],
  [/VSTARユニバース/g, 'VSTAR 유니버스'],
  [/パラダイムトリガー/g, '패러다임 트리거'],
  [/ロストアビス/g, '로스트 어비스'],
  [/VMAXクライマックス/g, 'VMAX 클라이맥스'],
  [/イーブイヒーローズ/g, '이브이 히어로즈'],
  [/シャイニースターV/g, '샤이니 스타 V'],
  [/マスターボールミラー/g, '마스터볼 미러'],
  [/モンスターボールミラー/g, '몬스터볼 미러'],
  [/シュリンクなし/g, '슈링크 없음'],
  [/ボックス/g, '박스'],
  [/パック/g, '팩'],
  [/ゲーム/g, '게임'],
  [/エラー版/g, '에러판'],
  [/の/g, '의'],
];

export type TranslateTarget = 'en' | 'ja';

/**
 * 공백 토큰화 후 사전 룩업. 미매칭 토큰은 원문 유지.
 * 대소문자 무시 (SAR / sar / Sar 동일 처리).
 * 한글은 case 개념 없음 → toLowerCase 영향 없음.
 */
export function translate(text: string, target: TranslateTarget): string {
  if (!text) return text;
  const map = target === 'en' ? MAP_EN : MAP_JA;
  return text
    .trim()
    .split(/\s+/)
    .map((tok) => map[tok.toLowerCase()] ?? tok)
    .join(' ');
}

export function translateKnownCardNameToKo(name: string): string {
  if (!name) return name;
  let out = name;
  for (const [from, to] of CARD_NAME_PHRASES) {
    out = out.replace(from, to);
  }
  for (const [from, to] of JA_TO_KO) {
    out = out.split(from).join(to);
  }
  return out
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[「]/g, '"')
    .replace(/[」]/g, '"')
    .replace(/([가-힣])([A-Z]{1,4}\b)/g, '$1 $2')
    .replace(/(ex|EX)([가-힣])/g, '$1 $2')
    .replace(/"([^)]+)"([가-힣])/g, '"$1" $2')
    .replace(/(팩|BOX|세트)"/g, '$1 "')
    .replace(/"(박스|팩|세트)/g, '" $1')
    .replace(/\s+/g, ' ')
    .trim();
}
