/**
 * 포켓몬 카드 도메인 한/영/일 변환 사전.
 * - 스니덩(일본) 검색: translate(text, 'ja')
 * - eBay(영미권) 검색: translate(text, 'en')
 *
 * 정책:
 *   - 입력을 사전 키로 *longest-first* 매칭하며 좌→우로 치환 (공백 토큰화 X)
 *     → "리자몽홀로", "메가다크라이ex" 같은 붙여쓴 합성어도 정상 변환
 *   - 매칭은 한글/일본어 부분은 그대로, 영문/숫자만 대소문자 무시 비교
 *     → "EX" / "ex" 매칭은 되지만 "EXAMPLE" 안의 "EX" 처럼 영문 단어 중간
 *        매칭은 피하기 위해, 영문 키는 양쪽이 단어 경계일 때만 치환
 *   - 카드 코드(예: "SV1-045", "151/165")는 매칭되지 않아 그대로 통과
 *   - 사전에 없는 포켓몬명은 원문 유지 → 필요한 이름만 추가
 *
 * 발음 직독(transliteration)을 절대 하지 않는다 — 리자몽 → リザードン 처럼
 * 정확한 일본어 표기를 반환하기 위해 사전 룩업만 사용.
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
  // 추가 인기 포켓몬 — snkrdunk 빈번 등장
  { ko: '다크라이',  en: 'darkrai',     ja: 'ダークライ' },
  { ko: '크레세리아', en: 'cresselia',  ja: 'クレセリア' },
  { ko: '겐가',      en: 'gengar',      ja: 'ゲンガー' },
  { ko: '고우스트',  en: 'haunter',     ja: 'ゴースト' },
  { ko: '고오스',    en: 'gastly',      ja: 'ゴース' },
  { ko: '망키',      en: 'mankey',      ja: 'マンキー' },
  { ko: '성원숭',    en: 'primeape',    ja: 'オコリザル' },
  { ko: '엘레키블',  en: 'electivire',  ja: 'エレキブル' },
  { ko: '마기라스',  en: 'tyranitar',   ja: 'バンギラス' },
  { ko: '메타그로스', en: 'metagross', ja: 'メタグロス' },
  { ko: '한카리아스', en: 'garchomp',  ja: 'ガブリアス' },
  { ko: '루카리오',  en: 'lucario',     ja: 'ルカリオ' },
  { ko: '게치스',    en: 'greninja',    ja: 'ゲッコウガ' },
  { ko: '게코우가',  en: 'greninja',    ja: 'ゲッコウガ' },
  { ko: '조로아',    en: 'zorua',       ja: 'ゾロア' },
  { ko: '조로아크',  en: 'zoroark',     ja: 'ゾロアーク' },
  { ko: '에이스번',  en: 'cinderace',   ja: 'エースバーン' },
  { ko: '인텔리레온', en: 'inteleon',   ja: 'インテレオン' },
  { ko: '고릴타',    en: 'rillaboom',   ja: 'ゴリランダー' },
  { ko: '드래펄트',  en: 'dragapult',   ja: 'ドラパルト' },
  { ko: '리갸도스',  en: 'gholdengo',   ja: 'サーフゴー' },
  { ko: '파오젠',    en: 'chien-pao',   ja: 'パオジアン' },
  { ko: '딘르',      en: 'ting-lu',     ja: 'ディンルー' },
  { ko: '청록',      en: 'chi-yu',      ja: 'チオンジェン' },
  { ko: '와이주',    en: 'wo-chien',    ja: 'イーユイ' },
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
  { ko: '마스터볼',  en: 'master ball', ja: 'マスターボール' },
  { ko: '미러',      en: 'mirror',      ja: 'ミラー' },
  { ko: '슈링크',    en: 'shrink',      ja: 'シュリンク' },

  // 자주 등장하는 카드 수식어 (포켓몬 이름 앞뒤로 붙는다)
  { ko: '메가',      en: 'mega',        ja: 'メガ' },
  { ko: '샤이니',    en: 'shiny',       ja: 'シャイニー' },
  { ko: '컬러풀',    en: 'colorful',    ja: 'カラフル' },
  { ko: '히어로즈',  en: 'heroes',      ja: 'ヒーローズ' },
  { ko: '스타',      en: 'star',        ja: 'スター' },
  { ko: '유니버스',  en: 'universe',    ja: 'ユニバース' },
  { ko: '트레저',    en: 'treasure',    ja: 'トレジャー' },
  { ko: '클라이맥스', en: 'climax',     ja: 'クライマックス' },
  { ko: '아이',      en: 'eye',         ja: 'アイ' },
  { ko: '어비스',    en: 'abyss',       ja: 'アビス' },
  { ko: '브레이커',  en: 'breaker',     ja: 'ブレイカー' },
  { ko: '브레이브',  en: 'brave',       ja: 'ブレイブ' },
  { ko: '심포니아',  en: 'symphonia',   ja: 'シンフォニア' },
  { ko: '아리나',    en: 'arena',       ja: 'アリーナ' },
  { ko: '드라고나',  en: 'dragona',     ja: 'ドラゴーナ' },
  { ko: '미라클',    en: 'miracle',     ja: 'ミラクル' },
  { ko: '원더러',    en: 'wanderer',    ja: 'ワンダラー' },
  { ko: '서프',      en: 'surf',        ja: 'サーフ' },
  { ko: '레이징',    en: 'raging',      ja: 'レイジング' },
  { ko: '플레어',    en: 'flare',       ja: 'フレア' },
  { ko: '볼트',      en: 'volt',        ja: 'ボルト' },
  { ko: '인페르노',  en: 'inferno',     ja: 'インフェルノ' },
  { ko: '드림',      en: 'dream',       ja: 'ドリーム' },
  { ko: '닌자',      en: 'ninja',       ja: 'ニンジャ' },
  { ko: '스피너',    en: 'spinner',     ja: 'スピナー' },
  { ko: '제로',      en: 'zero',        ja: 'ゼロ' },
  { ko: '파트너즈',  en: 'partners',    ja: 'パートナーズ' },
];

import { POKEMON_KO_TO_JA } from './pokemonNamesKoJa';

const ALL: Term[] = [...POKEMON, ...CARD_TERMS];

/**
 * 사전을 lowercase key → value 로 빌드해서 대소문자 무시 매칭.
 *
 * 우선순위: 큐레이션 POKEMON+CARD_TERMS > PokeAPI 전수 매핑.
 * 큐레이션이 먼저 들어가고, PokeAPI 매핑은 비어있는 키만 채운다.
 * → 직접 손본 별칭/특수 케이스(예: 게치스→ゲッコウガ 같은 한국 표기 변형)는
 *   덮어쓰지 않으면서, 전 1025종 자동 커버.
 */
const MAP_EN: Record<string, string> = Object.fromEntries(
  ALL.filter((t) => t.en).map((t) => [t.ko.toLowerCase(), t.en!]),
);
const MAP_JA: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [ko, ja] of Object.entries(POKEMON_KO_TO_JA)) {
    out[ko.toLowerCase()] = ja;
  }
  // 큐레이션 사전이 PokeAPI 보다 우선 (override)
  for (const t of ALL) {
    if (t.ja) out[t.ko.toLowerCase()] = t.ja;
  }
  return out;
})();
const JA_TO_KO: Array<[string, string]> = (() => {
  const pairs: Array<[string, string]> = [];
  for (const [ko, ja] of Object.entries(POKEMON_KO_TO_JA)) {
    pairs.push([ja, ko]);
  }
  for (const t of ALL) {
    if (t.ja) pairs.push([t.ja, t.ko]);
  }
  // 중복 JP 키는 마지막(큐레이션) 이 이김 — Map 으로 dedupe
  const dedup = new Map(pairs);
  return Array.from(dedup.entries()).sort((a, b) => b[0].length - a[0].length);
})();

const CARD_NAME_PHRASES: Array<[RegExp, string]> = [
  // 카드 자주 등장하는 접두/접미사 — 길이 긴 패턴 먼저
  [/MEGAバトルアシスト/g, 'MEGA 배틀 어시스트'],
  [/メガしんかセット/g, '메가 진화 세트'],
  [/メガしんか/g, '메가 진화'],
  [/MEGA/g, 'MEGA'],
  [/メガ/g, '메가'],
  [/[「『]/g, '"'],
  [/[」』]/g, '"'],
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

/** ASCII 영문/숫자 (단어 경계 검사 용). */
function isWordChar(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[A-Za-z0-9]/.test(ch);
}

/**
 * 사전 키들을 길이 내림차순으로 미리 정렬해두면 longest-first 매칭이 가능.
 * 모듈 로드 시 1회만 빌드.
 */
const MAP_KEYS_BY_TARGET: Record<TranslateTarget, string[]> = {
  ja: Object.keys(MAP_JA).sort((a, b) => b.length - a.length),
  en: Object.keys(MAP_EN).sort((a, b) => b.length - a.length),
};

/**
 * 입력 텍스트를 좌→우로 훑으며 사전 키 중 *가장 긴 것*을 우선 매칭해 치환.
 *
 * - 한글/일본어 키: 위치 i 에서 substring(i, k.length) 와 직접 비교 (case 무관)
 * - 영문/숫자 키: 위치 i 에서 시작이 단어 경계여야 매칭 (좌측 직전, 우측 직후 모두
 *   비-단어 문자거나 문자열 끝) — "EX" 가 "EXAMPLE" 의 EX 와 매칭되는 것을 방지
 *
 * 매칭 실패하면 한 글자 진행, 원본 그대로 출력.
 *
 * 발음 transliteration 은 절대 하지 않으며, 사전에 명시된 표기로만 변환한다.
 */
export function translate(text: string, target: TranslateTarget): string {
  if (!text) return text;
  const map = target === 'en' ? MAP_EN : MAP_JA;
  const keys = MAP_KEYS_BY_TARGET[target];
  const lowered = text.toLowerCase();

  let out = '';
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (const k of keys) {
      const end = i + k.length;
      if (end > text.length) continue;
      if (lowered.slice(i, end) !== k) continue;

      // 영문/숫자로 시작하는 키는 양쪽이 단어 경계여야 매칭.
      if (isWordChar(k[0])) {
        const prev = i > 0 ? text[i - 1] : undefined;
        const next = end < text.length ? text[end] : undefined;
        if (isWordChar(prev) || isWordChar(next)) continue;
      }

      out += map[k];
      i = end;
      matched = true;
      break;
    }
    if (!matched) {
      out += text[i];
      i++;
    }
  }
  return out;
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
