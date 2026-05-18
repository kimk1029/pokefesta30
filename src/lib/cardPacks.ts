/**
 * 카드 팩 카탈로그 — 홈/팩 상세에서 "팩별 힛카드" 그리드를 만드는 시드.
 *
 * 각 팩은 다음 두 가지 방식으로 힛카드를 채운다:
 *   1) curated: `hits` 배열에 직접 apparelId 박아둠 (정확)
 *   2) fallback: snkrdunk 검색 `searchQuery` 로 결과 가져와 채움
 *
 * 따라서 `hits` 가 비어 있어도 시스템은 검색만으로 동작한다.
 * 새 팩 출시 → 이 파일에 한 줄 추가 + 검색어만 박으면 끝.
 */

export interface CardPackHit {
  /** snkrdunk apparelId */
  apparelId: number;
  /** UI에 보일 이름 override (없으면 snkrdunk 응답의 localizedName 사용) */
  label?: string;
}

export interface CardPackMeta {
  /** 팩 코드 — 라우팅 슬러그로도 쓰임 (예: 'sv8a') */
  code: string;
  /** 풀 한국어 이름 */
  name: string;
  /** 카드 상단에 짧게 표시될 한국어 라벨 */
  shortName: string;
  /** 시각적 강조용 이모지 */
  emoji: string;
  /** 카드 상단 띠 배경 색 (theme tokens 의 hex 와 일관) */
  bg: string;
  /** 일본 출시일 (YYYY-MM-DD) — 정렬·표시에 사용 */
  releasedAt?: string;
  /** snkrdunk 검색 키워드 — `hits` 가 비어있을 때 자동 채움 */
  searchQuery: string;
  /** snkrdunk apparel group id — 박스별 전체 수록 싱글카드 목록 조회에 사용 */
  apparelGroupId?: number;
  /** 큐레이션된 카드 (apparelId 알면 박아둠) */
  hits: CardPackHit[];
}

/**
 * 시드 팩 8종.
 * apparelId 는 운영팀이 추후 큐레이팅으로 박을 수 있음. 그 전까지는 searchQuery
 * 로 자동 매칭. 출시일 내림차순 정렬 권장.
 */
export const CARD_PACKS: CardPackMeta[] = [
  {
    code: 'sv9a',
    name: '메가브레이브',
    shortName: '메가브레이브',
    emoji: '⚔️',
    bg: '#E63946',
    releasedAt: '2026-03-14',
    searchQuery: 'メガブレイブ',
    apparelGroupId: 3045,
    hits: [
    { apparelId: 663637, label: "リーリエの決心 SAR [M1L 091/063](拡張パック…" },
    { apparelId: 628146, label: "ポケモンカードゲームMEGA 拡張パック「メガブレイブ」ボックス" },
    { apparelId: 628198, label: "ポケモンカードゲームMEGA ポケモンセンターセット「メガブレ…" },
    { apparelId: 663636, label: "リーリエの決心 SR [M1L 086/063](拡張パック「…" },
    { apparelId: 664098, label: "マーシャドー AR [M1L 069/063](拡張パック「メ…" },
    { apparelId: 663638, label: "メガルカリオex MUR [M1L 092/063](拡張パッ…" },
    { apparelId: 664109, label: "メガアブソルex SAR [M1L 089/063](拡張パッ…" },
    { apparelId: 664105, label: "メガルカリオex SR [M1L 078/063](拡張パック…" },
    { apparelId: 628147, label: "ポケモンカードゲームMEGA 拡張パック「メガブレイブ」パック" },
    { apparelId: 657364, label: "メガルカリオex SAR [M1L 088/063](拡張パッ…" },
    { apparelId: 657362, label: "フシギソウ AR [M1L 065/063](拡張パック「メガ…" },
    { apparelId: 657361, label: "フシギダネ AR [M1L 064/063](拡張パック「メガ…" },
    ],
  },
  {
    code: 'sv9',
    name: '배틀 파트너즈',
    shortName: '배틀 파트너즈',
    emoji: '🤝',
    bg: '#3A5BD9',
    releasedAt: '2026-01-24',
    searchQuery: 'バトルパートナーズ',
    apparelGroupId: 2455,
    hits: [
    { apparelId: 485638, label: "ナンジャモのカイデン P [SV-P 232](プロモーション…" },
    { apparelId: 484952, label: "ポケモンカードゲーム スカーレット&バイオレット 拡張パック「…" },
    { apparelId: 485654, label: "Nのレシラム AR [SV9 109/100](拡張パック「バ…" },
    { apparelId: 505952, label: "リーリエのアブリボン AR [SV9 105/100](拡張パ…" },
    { apparelId: 502986, label: "フリーザー AR [SV9 102/100](拡張パック「バト…" },
    { apparelId: 485655, label: "ナンジャモのハラバリーex SAR [SV9 125/100]…" },
    { apparelId: 485656, label: "ポケモンカードゲーム デッキビルドBOX 「バトルパートナーズ」" },
    { apparelId: 505953, label: "リーリエのピッピex SR [SV9 115/100](拡張パ…" },
    { apparelId: 505957, label: "ボーマンダex SAR [SV9 129/100](拡張パック…" },
    { apparelId: 506158, label: "ボルケニオンex SAR [SV9 124/100](拡張パッ…" },
    { apparelId: 505956, label: "リーリエのピッピex SAR [SV9 126/100](拡張…" },
    { apparelId: 484953, label: "ポケモンカードゲーム スカーレット&バイオレット 拡張パック「…" },
    ],
  },
  {
    code: 'sv8a',
    name: '테라스타르 페스티벌 ex',
    shortName: '테라스타르 ex',
    emoji: '✨',
    bg: '#7C3AED',
    releasedAt: '2025-01-24',
    searchQuery: 'テラスタルフェスティバル',
    apparelGroupId: 2295,
    hits: [
    { apparelId: 424297, label: "ポケモンカードゲーム スカーレット&バイオレット ハイクラスパ…" },
    { apparelId: 471633, label: "ブラッキー :マスターボールミラー [SV8a 092/187…" },
    { apparelId: 455676, label: "イーブイex SAR [SV8a 223/187](ハイクラス…" },
    { apparelId: 469628, label: "エーフィex SAR [SV8a 211/187](ハイクラス…" },
    { apparelId: 455596, label: "ブラッキーex SAR [SV8a 217/187](ハイクラ…" },
    { apparelId: 455595, label: "ニンフィアex SAR [SV8a 212/187](ハイクラ…" },
    { apparelId: 424298, label: "ポケモンカードゲーム スカーレット&バイオレット ハイクラスパ…" },
    { apparelId: 469625, label: "リーフィアex SAR [SV8a 200/187](ハイクラ…" },
    { apparelId: 469630, label: "イーブイex SAR [SV8a 224/187](ハイクラス…" },
    { apparelId: 455594, label: "グレイシアex SAR [SV8a 206/187](ハイクラ…" },
    { apparelId: 466510, label: "トドロクツキex SAR [SV8a 218/187](ハイク…" },
    { apparelId: 459531, label: "ブースターex SAR [SV8a 202/187](ハイクラ…" },
    ],
  },
  {
    code: 'sv8',
    name: '슈퍼일렉트릭 브레이커',
    shortName: '일렉트릭 브레이커',
    emoji: '⚡',
    bg: '#FFD23F',
    releasedAt: '2024-10-18',
    searchQuery: '超電ブレイカー',
    apparelGroupId: 2081,
    hits: [
    { apparelId: 418741, label: "レアコイル AR [SV8 112/106](拡張パック「超電…" },
    { apparelId: 395189, label: "ポケモンカードゲーム スカーレット&バイオレット 拡張パック「…" },
    { apparelId: 408333, label: "ピカチュウex SAR [SV8 132/106](拡張パック…" },
    { apparelId: 413158, label: "サザンドラex SAR [SV8 133/106](拡張パック…" },
    { apparelId: 418755, label: "ピカチュウex UR [SV8 136/106](拡張パック「…" },
    { apparelId: 395190, label: "ポケモンカードゲーム スカーレット&バイオレット 拡張パック「…" },
    { apparelId: 411885, label: "ソウブレイズ AR [SV8 109/106](拡張パック「超…" },
    { apparelId: 395201, label: "ピカチュウex SR [SV8 122/106](拡張パック「…" },
    { apparelId: 395191, label: "ピカチュウex RR [SV8 033/106](拡張パック「…" },
    { apparelId: 408331, label: "ミロカロスex SAR [SV8 131/106](拡張パック…" },
    { apparelId: 416951, label: "ミカンのまなざし SAR [SV8 135/106](拡張パッ…" },
    { apparelId: 408338, label: "ヒンバス AR [SV8 110/106](拡張パック「超電ブ…" },
    ],
  },
  {
    code: 'sv7a',
    name: '낙원 드라고나',
    shortName: '낙원 드라고나',
    emoji: '🐉',
    bg: '#22C55E',
    releasedAt: '2024-09-13',
    searchQuery: '楽園ドラゴーナ',
    apparelGroupId: 1884,
    hits: [
    { apparelId: 358115, label: "ラティアスex SAR [SV7a 087/064](強化拡張…" },
    { apparelId: 358116, label: "アローラナッシーex SAR [SV7a 089/064](強…" },
    { apparelId: 342761, label: "ポケモンカードゲーム スカーレット&バイオレット 強化拡張パッ…" },
    { apparelId: 382399, label: "ルチアのアピール SAR [SV7a 091/064](強化拡…" },
    { apparelId: 379013, label: "ルチアのアピール SR [SV7a 086/064](強化拡張…" },
    { apparelId: 342762, label: "ポケモンカードゲーム スカーレット&バイオレット 強化拡張パッ…" },
    { apparelId: 358113, label: "ラティオス AR [SV7a 070/064](強化拡張パック…" },
    { apparelId: 383045, label: "エアームド AR [SV7a 073/064](強化拡張パック…" },
    { apparelId: 385173, label: "カキツバタ SAR [SV7a 090/064](強化拡張パッ…" },
    { apparelId: 383044, label: "タタッコ AR [SV7a 072/064](強化拡張パック「…" },
    { apparelId: 567445, label: "【シュリンクなし】 ポケモンカードゲーム スカーレット&バイオ…" },
    { apparelId: 379014, label: "ブリジュラスex SAR [SV7a 088/064](強化拡…" },
    ],
  },
  {
    code: 'sv7',
    name: '스텔라 미라클',
    shortName: '스텔라 미라클',
    emoji: '🌌',
    bg: '#0D9488',
    releasedAt: '2024-07-19',
    searchQuery: 'ステラミラクル',
    apparelGroupId: 1469,
    hits: [
    { apparelId: 567444, label: "【シュリンクなし】 ポケモンカードゲーム スカーレット&バイオ…" },
    { apparelId: 320348, label: "タロ SR [SV7 124/102](拡張パック「ステラミラ…" },
    { apparelId: 318880, label: "ゼラオラ AR [SV7 109/102](拡張パック「ステラ…" },
    { apparelId: 283206, label: "ポケモンカードゲーム スカーレット&バイオレット 拡張パック「…" },
    { apparelId: 283207, label: "ポケモンカードゲーム スカーレット&バイオレット 拡張パック「…" },
    { apparelId: 323630, label: "タロ SAR [SV7 131/102](拡張パック「ステラミ…" },
    { apparelId: 307293, label: "テラパゴスex SAR [SV7 130/102](拡張パック…" },
    { apparelId: 283208, label: "ポケモンカードゲーム スカーレット&バイオレット デッキビルド…" },
    { apparelId: 320158, label: "かがやくリザードン [SVK 001/044](デッキビルドB…" },
    { apparelId: 320161, label: "かがやくゲッコウガ [SVK 004/044](デッキビルドB…" },
    { apparelId: 325684, label: "ブリジュラス AR [SV7 113/102](拡張パック「ス…" },
    { apparelId: 323631, label: "ブライア SAR [SV7 132/102](拡張パック「ステ…" },
    ],
  },
  {
    code: 'sv6a',
    name: '나이트 원더러',
    shortName: '나이트 원더러',
    emoji: '🌙',
    bg: '#1B2E89',
    releasedAt: '2024-06-07',
    searchQuery: 'ナイトワンダラー',
    apparelGroupId: 1162,
    hits: [
    { apparelId: 261657, label: "ポケモンカードゲーム スカーレット&バイオレット 強化拡張パッ…" },
    { apparelId: 261658, label: "ポケモンカードゲーム スカーレット&バイオレット 強化拡張パッ…" },
    { apparelId: 283815, label: "カシオペア SAR [SV6a 091/064](強化拡張パッ…" },
    { apparelId: 284962, label: "キチキギスex SAR [SV6a 089/064](強化拡張…" },
    { apparelId: 567443, label: "【シュリンクなし】 ポケモンカードゲーム スカーレット&バイオ…" },
    { apparelId: 277254, label: "ヨノワール AR [SV6a 070/064](強化拡張パック…" },
    { apparelId: 284953, label: "ペルシアン AR [SV6a 075/064](強化拡張パック…" },
    { apparelId: 282193, label: "ヘルガー AR [SV6a 066/064](強化拡張パック「…" },
    { apparelId: 282196, label: "カシオペア SR [SV6a 085/064](強化拡張パック…" },
    { apparelId: 282238, label: "オノンド AR [SV6a 074/064](強化拡張パック「…" },
    { apparelId: 284964, label: "大地の器 UR [SV6a 093/064](強化拡張パック「…" },
    { apparelId: 282237, label: "ゾロア AR [SV6a 072/064](強化拡張パック「ナ…" },
    ],
  },
  {
    code: 'sv5a',
    name: '크림슨 헤이즈',
    shortName: '크림슨 헤이즈',
    emoji: '🔥',
    bg: '#F97316',
    releasedAt: '2024-03-22',
    searchQuery: 'クリムゾンヘイズ',
    apparelGroupId: 739,
    hits: [
    { apparelId: 204134, label: "ポケモンカードゲーム スカーレット&バイオレット 強化拡張パッ…" },
    { apparelId: 224087, label: "ゲッコウガex SAR [SV5a 090/066](強化拡張…" },
    { apparelId: 224086, label: "イーブイ AR [SV5a 078/066](強化拡張パック「…" },
    { apparelId: 204135, label: "ポケモンカードゲーム スカーレット&バイオレット 強化拡張パッ…" },
    { apparelId: 227633, label: "ゲッコウガex SR [SV5a 083/066](強化拡張パ…" },
    { apparelId: 224088, label: "サザレ SAR [SV5a 092/066](強化拡張パック「…" },
    { apparelId: 225734, label: "スイレンのお世話 SAR [SV5a 093/066](強化拡…" },
    { apparelId: 221942, label: "スイレンのお世話 SR [SV5a 088/066](強化拡張…" },
    { apparelId: 224085, label: "ヒスイガーディ AR [SV5a 075/066](強化拡張パ…" },
    { apparelId: 221941, label: "サザレ SR [SV5a 087/066](強化拡張パック「ク…" },
    { apparelId: 210034, label: "ゴウカザル AR [SV5a 070/066](強化拡張パック…" },
    { apparelId: 567441, label: "【シュリンクなし】 ポケモンカードゲーム スカーレット&バイオ…" },
    ],
  },
];

export function getCardPack(code: string): CardPackMeta | undefined {
  return CARD_PACKS.find((p) => p.code === code);
}
