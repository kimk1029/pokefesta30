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

  // 트레이너 카드 분류 (스니덩/이베이 카테고리 표기)
  { ko: '서포터',    en: 'supporter',   ja: 'サポート' },
  { ko: '서포트',    en: 'supporter',   ja: 'サポート' },
  { ko: '트레이너스', en: 'trainer',    ja: 'トレーナーズ' },
  { ko: '트레이너',  en: 'trainer',     ja: 'トレーナーズ' },
  { ko: '아이템',    en: 'item',        ja: 'グッズ' },
  { ko: '굿즈',      en: 'item',        ja: 'グッズ' },
  { ko: '스타디움',  en: 'stadium',     ja: 'スタジアム' },
  { ko: '도구',      en: 'tool',        ja: 'ポケモンのどうぐ' },

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

/**
 * 트레이너/등장인물 이름. 한국·일본 공식 표기가 *다른* 케이스 중심.
 * 일본 카드 (snkrdunk) 에서 イラスト・SAR/CHR 등에 등장하는 이름이 한국어
 * 검색어로 잡히도록 양방향 매핑. 같은 표기여도 사전에 두면 검색 안정성 ↑.
 *
 *   ex) '메이' 또는 '명희' 검색 → 'メイ' 로 변환되어 snkrdunk 결과 노출
 *       응답의 'メイ' 는 표시 단계에서 '명희' 로 한국어화
 */
const CHARACTERS: Term[] = [
  // KR/JP 표기가 명확히 다른 케이스
  { ko: '명희',     ja: 'メイ',         en: 'Rosa' },           // BW2 여주인공
  { ko: '메이',     ja: 'メイ',         en: 'Rosa' },           // KR 동인 표기 — 같은 인물
  { ko: '휴이',     ja: 'キョウヘイ',   en: 'Hugh' },           // BW2 남주인공
  { ko: '모야모',   ja: 'ナンジャモ',   en: 'Iono' },           // SV 전기 체육관 관장 (KR 공식명)
  { ko: '모란',     ja: 'ボタン',       en: 'Penny' },          // SV — KR 공식명 '모란' = Penny(ボタン)
  { ko: '난천',     ja: 'シロナ',       en: 'Cynthia' },        // 신오 챔피언
  { ko: '풀잎',     ja: 'ナタネ',       en: 'Gardenia' },       // 신오 풀 체육관
  { ko: '단지',     ja: 'デンジ',       en: 'Volkner' },        // 신오 전기 체육관
  { ko: '태홍',     ja: 'アカギ',       en: 'Cyrus' },          // 신오 갤럭틱단 보스
  { ko: '진철',     ja: 'シンジ',       en: 'Paul' },           // 신오 라이벌 (애니)
  { ko: '미카',     ja: 'カトレア',     en: 'Caitlin' },        // 단,투 4천왕
  { ko: '벨라',     ja: 'ベル',         en: 'Bianca' },         // BW 라이벌
  { ko: '체렌',     ja: 'チェレン',     en: 'Cheren' },         // BW 라이벌
  { ko: '스즈나',   ja: 'スズナ',       en: 'Candice' },        // 신오 얼음 체육관
  { ko: '미스즈',   ja: 'ミタル',       en: 'Bertha' },         // 신오 4천왕 (땅)
  // 표기 거의 동일하지만 양방향 안전망 — 인기 캐릭
  { ko: '리리에',   ja: 'リーリエ',     en: 'Lillie' },
  { ko: '구즈마',   ja: 'グズマ',       en: 'Guzma' },
  { ko: '루자미네', ja: 'ルザミーネ',   en: 'Lusamine' },
  { ko: '구라이브', ja: 'グラジオ',     en: 'Gladion' },
  { ko: '페퍼',     ja: 'ペパー',       en: 'Pepper' },         // SV
  { ko: '아오키',   ja: 'アオキ',       en: 'Larry' },          // SV 노말 체육관
  { ko: '보탄',     ja: 'ボタン',       en: 'Penny' },          // SV
  { ko: '하사크',   ja: 'ハッサク',     en: 'Hassel' },         // SV
  { ko: '미모사',   ja: 'ミモザ',       en: 'Miriam' },         // SV 아카데미 양호교사
  // 클래식 트레이너 + 구어체 별칭 — KR/JP 표기가 달라 snkrdunk 검색이 안 잡히던 케이스
  { ko: '이슬이',   ja: 'カスミ',       en: 'Misty' },          // 무인편 히로인 / 물 체육관
  { ko: '비주기',   ja: 'サカキ',       en: 'Giovanni' },       // 로켓단 보스 / 상록 체육관
  { ko: '냐옹',     ja: 'ニャース',     en: 'Meowth' },         // 구어체 — 공식명 '나옹'은 PokeAPI 사전
  { ko: '로켓단',   ja: 'ロケット団',   en: 'Team Rocket' },
  { ko: '한지우',   ja: 'サトシ',       en: 'Ash' },            // 무인편 주인공
  // 관동 체육관 관장 (나무위키/포켓몬위키 확인)
  { ko: '마티스',   ja: 'マチス',       en: 'Lt. Surge' },
  { ko: '민화',     ja: 'エリカ',       en: 'Erika' },
  { ko: '독수',     ja: 'キョウ',       en: 'Koga' },
  { ko: '강연',     ja: 'カツラ',       en: 'Blaine' },
  { ko: '초련',     ja: 'ナツメ',       en: 'Sabrina' },
  // 애니 로켓단 삼인방 + 라이벌/동료 (한국 더빙명 ↔ 일본명)
  { ko: '로사',     ja: 'ムサシ',       en: 'Jessie' },
  { ko: '로이',     ja: 'コジロウ',     en: 'James' },
  { ko: '웅',       ja: 'タケシ',       en: 'Brock' },
  { ko: '오바람',   ja: 'シゲル',       en: 'Gary' },
  { ko: '봄이',     ja: 'ハルカ',       en: 'May' },
  { ko: '빛나',     ja: 'ヒカリ',       en: 'Dawn' },
  { ko: '세레나',   ja: 'セレナ',       en: 'Serena' },
  { ko: '고우',     ja: 'ゴウ',         en: 'Goh' },
  // 챔피언 / 빌런 두목 / 박사
  { ko: '목호',     ja: 'ワタル',       en: 'Lance' },
  { ko: '단델',     ja: 'ダンデ',       en: 'Leon' },
  { ko: '게치스',   ja: 'ゲーチス',     en: 'Ghetsis' },
  { ko: '플라드리', ja: 'フラダリ',     en: 'Lysandre' },
  { ko: '오박사',   ja: 'オーキド',     en: 'Prof. Oak' },
  // 빌런 두목 (검색 확인)
  { ko: '마적',     ja: 'マツブサ',     en: 'Maxie' },          // 마그마단
  { ko: '아강',     ja: 'アオギリ',     en: 'Archie' },         // 아쿠아단
  { ko: '로즈',     ja: 'ローズ',       en: 'Rose' },           // 마크로코스모스
  // 챔피언
  { ko: '윤진',     ja: 'ミクリ',       en: 'Wallace' },        // 호연 챔피언/루네 관장
  { ko: '노간주',   ja: 'アデク',       en: 'Alder' },          // 하나
  { ko: '백연',     ja: 'カルネ',       en: 'Diantha' },        // 칼로스
  { ko: '네모',     ja: 'ネモ',         en: 'Nemona' },         // 팔데아
  // 칼로스/하나/알로라 동료·캡틴
  { ko: '시트론',   ja: 'シトロン',     en: 'Clemont' },
  { ko: '유리카',   ja: 'ユリーカ',     en: 'Bonnie' },
  { ko: '아이리스', ja: 'アイリス',     en: 'Iris' },
  { ko: '덴트',     ja: 'デント',       en: 'Cilan' },
  { ko: '마오',     ja: 'マオ',         en: 'Mallow' },
  { ko: '스이렌',   ja: 'スイレン',     en: 'Lana' },
  { ko: '카키',     ja: 'カキ',         en: 'Kiawe' },
  { ko: '마마네',   ja: 'マーマネ',     en: 'Sophocles' },
  { ko: '코하루',   ja: 'コハル',       en: 'Chloe' },
  // 성도 체육관 관장 (타입 매칭으로 검증)
  { ko: '비상',     ja: 'ハヤト',       en: 'Falkner' },
  { ko: '호일',     ja: 'ツクシ',       en: 'Bugsy' },
  { ko: '꼭두',     ja: 'アカネ',       en: 'Whitney' },
  { ko: '유빈',     ja: 'マツバ',       en: 'Morty' },
  { ko: '사도',     ja: 'シジマ',       en: 'Chuck' },
  { ko: '규리',     ja: 'ミカン',       en: 'Jasmine' },
  { ko: '류옹',     ja: 'ヤナギ',       en: 'Pryce' },
  { ko: '이향',     ja: 'イブキ',       en: 'Clair' },
  // 호연 체육관 관장 + 챔피언
  { ko: '원규',     ja: 'ツツジ',       en: 'Roxanne' },
  { ko: '철구',     ja: 'トウキ',       en: 'Brawly' },
  { ko: '암페어',   ja: 'テッセン',     en: 'Wattson' },
  { ko: '민지',     ja: 'アスナ',       en: 'Flannery' },
  { ko: '종길',     ja: 'センリ',       en: 'Norman' },
  { ko: '은송',     ja: 'ナギ',         en: 'Winona' },
  { ko: '아단',     ja: 'アダン',       en: 'Juan' },
  { ko: '성호',     ja: 'ダイゴ',       en: 'Steven' },
  // 신오 체육관 관장
  { ko: '강석',     ja: 'ヒョウタ',     en: 'Roark' },
  { ko: '유채',     ja: 'ナタネ',       en: 'Gardenia' },
  { ko: '자두',     ja: 'スモモ',       en: 'Maylene' },
  { ko: '맥실러',   ja: 'マキシ',       en: 'Crasher Wake' },
  { ko: '멜리사',   ja: 'メリッサ',     en: 'Fantina' },
  { ko: '동골',     ja: 'トウガン',     en: 'Byron' },
  // 콜라보 일러스트레이터/브랜드 — 한국에서는 한글 표기로 검색하지만 일본/북미는
  // 브랜드명을 그대로 영문 'YU NAGABA' 로 노출. ja/en 동일.
  { ko: '유나가바', ja: 'YU NAGABA',    en: 'YU NAGABA' },
  { ko: '나가바',   ja: 'YU NAGABA',    en: 'YU NAGABA' },
];

/**
 * 인기 서포터/트레이너 카드 *전체 이름* (이름+효과). longest-first 매칭 덕분에
 * 개별 이름보다 먼저 잡혀 한 번에 정확한 일본어 카드명으로 변환된다.
 *   ex) '릴리에의 전력' → 'リーリエの全力'
 */
const SUPPORTER_CARDS: Term[] = [
  { ko: '릴리에의 전력',   ja: 'リーリエの全力',     en: "Lillie's Full Force" },
  { ko: '난천의 패기',     ja: 'シロナの覇気',       en: "Cynthia's Ambition" },
  { ko: '마리의 프라이드', ja: 'マリィのプライド',   en: "Marnie's Pride" },
  { ko: '보스의 지령',     ja: 'ボスの指令',         en: "Boss's Orders" },
  { ko: '박사의 연구',     ja: '博士の研究',         en: "Professor's Research" },
];

/**
 * 인기 서포터/트레이너 개인명 — 한/일 공식 표기 매핑.
 * snkrdunk(일본) 검색이 한국어 표기로 안 잡히던 케이스 보강.
 * 표기가 같아도 양방향 안정성을 위해 사전에 둔다.
 */
const TRAINERS_EXTRA: Term[] = [
  // 인기 서포터
  { ko: '릴리에',   ja: 'リーリエ',     en: 'Lillie' },
  { ko: '마리',     ja: 'マリィ',       en: 'Marnie' },
  // 박사 (SV/SM/XY/BW)
  { ko: '플라타느박사', ja: 'プラターヌ博士', en: 'Professor Sycamore' },
  { ko: '쿠쿠이박사',   ja: 'ククイ博士',     en: 'Professor Kukui' },
  { ko: '주박사',       ja: 'アララギ博士',   en: 'Professor Juniper' },
  { ko: '올림박사',     ja: 'オーリム博士',   en: 'Professor Sada' },
  { ko: '투로박사',     ja: 'フトゥー博士',   en: 'Professor Turo' },
  // 관동/성도 클래식 + 챔피언/라이벌
  { ko: '이슬',     ja: 'カスミ',       en: 'Misty' },
  { ko: '그린',     ja: 'グリーン',     en: 'Blue' },
  { ko: '레드',     ja: 'レッド',       en: 'Red' },
  { ko: '블루',     ja: 'ブルー',       en: 'Leaf' },
  { ko: '카렌',     ja: 'カリン',       en: 'Karen' },
  // 하나/칼로스
  { ko: '벨',       ja: 'ベル',         en: 'Bianca' },
  { ko: '카밀레',   ja: 'カミツレ',     en: 'Elesa' },
  { ko: '사나',     ja: 'サナ',         en: 'Shauna' },
  { ko: '티에르노', ja: 'ティエルノ',   en: 'Tierno' },
  { ko: '트로바',   ja: 'トロバ',       en: 'Trevor' },
  { ko: '카르네',   ja: 'カルネ',       en: 'Diantha' },
  // 알로라 (썬문)
  { ko: '하우',     ja: 'ハウ',         en: 'Hau' },
  { ko: '글라디오', ja: 'グラジオ',     en: 'Gladion' },
  { ko: '일리마',   ja: 'イリマ',       en: 'Ilima' },
  { ko: '키아웨',   ja: 'カキ',         en: 'Kiawe' },
  { ko: '수련',     ja: 'スイレン',     en: 'Lana' },
  { ko: '아세로라', ja: 'アセロラ',     en: 'Acerola' },
  { ko: '할라',     ja: 'ハラ',         en: 'Hala' },
  { ko: '구즈마&할라', ja: 'グズマ&ハラ', en: 'Guzma & Hala' },
  { ko: '말리화',   ja: 'マツリカ',     en: 'Mina' },
  { ko: '나누',     ja: 'クチナシ',     en: 'Nanu' },
  { ko: '라이치',   ja: 'ライチ',       en: 'Olivia' },
  { ko: '비케',     ja: 'ビッケ',       en: 'Wicke' },
  { ko: '플루메리', ja: 'プルメリ',     en: 'Plumeria' },
  // 가라르 (소드실드)
  { ko: '호브',     ja: 'ホップ',       en: 'Hop' },
  { ko: '비트',     ja: 'ビート',       en: 'Bede' },
  { ko: '소니아',   ja: 'ソニア',       en: 'Sonia' },
  { ko: '야청',     ja: 'ルリナ',       en: 'Nessa' },
  { ko: '채두',     ja: 'サイトウ',     en: 'Bea' },
  { ko: '어니언',   ja: 'オニオン',     en: 'Allister' },
  { ko: '순무',     ja: 'カブ',         en: 'Kabu' },
  { ko: '포플러',   ja: 'ポプラ',       en: 'Opal' },
  { ko: '금랑',     ja: 'キバナ',       en: 'Raihan' },
  { ko: '두송',     ja: 'ネズ',         en: 'Piers' },
  { ko: '올리브',   ja: 'オリーヴ',     en: 'Oleana' },
  { ko: '멜론',     ja: 'メロン',       en: 'Melony' },
  { ko: '피오니',   ja: 'ピオニー',     en: 'Peony' },
  // 팔데아 (스칼렛바이올렛)
  { ko: '클라벨',   ja: 'クラベル',     en: 'Clavell' },
  { ko: '지니어',   ja: 'ジニア',       en: 'Jacq' },
  { ko: '테사',     ja: 'オモダカ',     en: 'Geeta' },
  { ko: '단풍',     ja: 'カエデ',       en: 'Katy' },
  { ko: '콜사',     ja: 'コルサ',       en: 'Brassius' },
  { ko: '곤포',     ja: 'ハイダイ',     en: 'Kofu' },
  { ko: '청목',     ja: 'アオキ',       en: 'Larry' },
  { ko: '라임',     ja: 'ライム',       en: 'Ryme' },
  { ko: '리파',     ja: 'リップ',       en: 'Tulip' },
  { ko: '그루샤',   ja: 'グルーシャ',   en: 'Grusha' },
  { ko: '카지',     ja: 'スグリ',       en: 'Kieran' },
  { ko: '시유',     ja: 'ゼイユ',       en: 'Carmine' },
];

/**
 * 박스/확장팩(세트) 이름 + 일본 지명. snkrdunk 의 박스 매물·지역 한정 프로모는
 * 한국어 표기가 달라(세트명) 혹은 한자라(지명) 검색이 안 잡히던 케이스.
 * 세트명은 cardNameKo 의 JA→KO 표기를 KO→JA 로 뒤집은 것.
 */
const SETS_PLACES: Term[] = [
  // 박스/확장팩 용어 (박스·팩·부스터는 CARD_TERMS 에 있음)
  { ko: '확장팩', ja: '拡張パック' },
  { ko: '강화확장팩', ja: '強化拡張パック' },
  { ko: '강화 확장팩', ja: '強化拡張パック' },
  { ko: '하이클래스팩', ja: 'ハイクラスパック' },
  { ko: '하이클래스 팩', ja: 'ハイクラスパック' },
  { ko: '덱빌드박스', ja: 'デッキビルドBOX' },
  { ko: '포켓몬센터', ja: 'ポケモンセンター' },
  // 세트(확장팩) 이름 — 박스가 이 이름으로 판매됨
  { ko: '배틀 파트너즈', ja: 'バトルパートナーズ' },
  { ko: '로켓단의 영광', ja: 'ロケット団の栄光' },
  { ko: '열풍의 아리나', ja: '熱風のアリーナ' },
  { ko: '테라스타르 페스티벌', ja: 'テラスタルフェスティバル' },
  { ko: '슈퍼일렉트릭 브레이커', ja: '超電ブレイカー' },
  { ko: '초전 브레이커', ja: '超電ブレイカー' },
  { ko: '낙원 드라고나', ja: '楽園ドラゴーナ' },
  { ko: '화이트플레어', ja: 'ホワイトフレア' },
  { ko: '블랙볼트', ja: 'ブラックボルト' },
  { ko: '스텔라 미라클', ja: 'ステラミラクル' },
  { ko: '나이트 원더러', ja: 'ナイトワンダラー' },
  { ko: '변환의 가면', ja: '変幻の仮面' },
  { ko: '크림슨 헤이즈', ja: 'クリムゾンヘイズ' },
  { ko: '사이버 저지', ja: 'サイバージャッジ' },
  { ko: '와일드 포스', ja: 'ワイルドフォース' },
  { ko: '샤이니 트레저', ja: 'シャイニートレジャー' },
  { ko: '미래의 일섬', ja: '未来の一閃' },
  { ko: '고대의 포효', ja: '古代の咆哮' },
  { ko: '레이징 서프', ja: 'レイジングサーフ' },
  { ko: '흑염의 지배자', ja: '黒炎の支配者' },
  { ko: '클레이버스트', ja: 'クレイバースト' },
  { ko: '스노해저드', ja: 'スノーハザード' },
  { ko: '트리플렛 비트', ja: 'トリプレットビート' },
  { ko: 'VSTAR 유니버스', ja: 'VSTARユニバース' },
  { ko: '패러다임 트리거', ja: 'パラダイムトリガー' },
  { ko: '로스트 어비스', ja: 'ロストアビス' },
  { ko: 'VMAX 클라이맥스', ja: 'VMAXクライマックス' },
  { ko: '이브이 히어로즈', ja: 'イーブイヒーローズ' },
  { ko: '샤이니 스타 V', ja: 'シャイニースターV' },
  { ko: '칠흑의 가이스트', ja: '漆黒のガイスト' },
  { ko: '백은의 랜스', ja: '白銀のランス' },
  { ko: '경천의 볼테카', ja: '仰天のボルテッカー' },
  { ko: '일격 마스터', ja: '一撃マスター' },
  { ko: '연격 마스터', ja: '連撃マスター' },
  { ko: '쌍벽의 파이터', ja: '双璧のファイター' },
  { ko: '마천 퍼펙트', ja: '摩天パーフェクト' },
  { ko: '창공 스트림', ja: '蒼空ストリーム' },
  { ko: '퓨전 아츠', ja: 'フュージョンアーツ' },
  { ko: '타임게이저', ja: 'タイムゲイザー' },
  { ko: '스페이스 저글러', ja: 'スペースジャグラー' },
  // 일본 지명(한자) — 지역 한정/포켓몬센터 프로모 검색
  { ko: '후쿠오카', ja: '福岡' },
  { ko: '토호쿠', ja: '東北' },
  { ko: '히로시마', ja: '広島' },
  { ko: '오사카', ja: '大阪' },
  { ko: '도쿄', ja: '東京' },
  { ko: '삿포로', ja: '札幌' },
  { ko: '나고야', ja: '名古屋' },
  { ko: '요코하마', ja: '横浜' },
  { ko: '센다이', ja: '仙台' },
  { ko: '교토', ja: '京都' },
  { ko: '고베', ja: '神戸' },
  { ko: '오키나와', ja: '沖縄' },
];

const ALL: Term[] = [...POKEMON, ...CARD_TERMS, ...CHARACTERS, ...TRAINERS_EXTRA, ...SUPPORTER_CARDS, ...SETS_PLACES];

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
  // 트레이너 카드 이름 (한국 공식 표기) — 길이 긴 phrase 먼저
  [/メイのきまぐれ/g, '명희의 격려'],
  [/モランのストレッチ/g, '모란의 스트레치'],
  [/ナンジャモのきまぐれ/g, '모야모의 격려'],
  [/シロナのお祝い/g, '난천의 축하'],
  [/ナタネのおもてなし/g, '풀잎의 환대'],
  [/ペパーのストックリスト/g, '페퍼의 스톡 리스트'],
  [/ボタンのファインプレー/g, '보탄의 파인 플레이'],
  [/アオキのスマートウォッチ/g, '아오키의 스마트워치'],
  [/ハッサクのトロフィー/g, '하사크의 트로피'],
  [/リーリエの全力/g, '릴리에의 전력'],
  [/シロナの覇気/g, '난천의 패기'],
  [/マリィのプライド/g, '마리의 프라이드'],
  [/ボスの指令/g, '보스의 지령'],
  [/博士の研究/g, '박사의 연구'],
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
  // 자주 등장하는 카타카나 세트/상품 용어 (긴 패턴 먼저)
  [/プロモカードパック/g, '프로모 카드팩'],
  [/プロモカード/g, '프로모 카드'],
  [/スタートデッキ/g, '스타트 덱'],
  [/バトルコレクション/g, '배틀 컬렉션'],
  [/ハッピーセット/g, '해피세트'],
  [/マクドナルド/g, '맥도날드'],
  [/スペシャルBOX/g, '스페셜 박스'],
  [/スペシャルセット/g, '스페셜 세트'],
  [/スペシャル/g, '스페셜'],
  [/ポケモンセンター/g, '포켓몬센터'],
  [/コレクション/g, '컬렉션'],
  [/オリジナル/g, '오리지널'],
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
 * "주년"(anniversary) → "th". 숫자가 붙으면 함께 묶어 변환.
 *   25주년 → 25th / 20주년 → 20th / 주년 → th
 * 숫자와 주년이 띄어쓰기로 떨어진 경우(25 주년)도 처리.
 * 사전 룩업(longest-first) 전에 선치환한다.
 */
function normalizeAnniversary(text: string): string {
  return text
    // "25주년", "25 주년" → "25th"
    .replace(/(\d+)\s*주년/g, '$1th')
    // 숫자 없는 "주년" → "th"
    .replace(/주년/g, 'th');
}

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
  // "25주년 → 25th" 등 주년 패턴을 먼저 정규화한 뒤 사전 룩업.
  text = normalizeAnniversary(text);
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
