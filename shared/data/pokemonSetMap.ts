// pokemon-set-map.ts
//
// 웹 + 모바일 공통 — 포켓몬 TCG 세트 코드 → 한글 팩 이름 + 시리즈(era) 매핑.
// 카드 사진을 찍어 OCR 한 결과의 setCode (e.g. "SV8a", "M4") 로 한국어 팩 이름을
// 보여주려면 이 맵이 필요. 양쪽 클라이언트가 같은 카탈로그를 보도록 단일 소스로 관리.

export const POKEMON_SET_MAP = {
  // =========================
  // MEGA
  // =========================
  M4: {
    code: "M4",
    name: "MEGA 확장팩 닌자스피너",
    era: "MEGA",
  },
  M3: {
    code: "M3",
    name: "MEGA 확장팩 니힐제로",
    era: "MEGA",
  },
  M2A: {
    code: "M2a",
    name: "MEGA 하이클래스팩 MEGA 드림 ex",
    era: "MEGA",
  },
  M2: {
    code: "M2",
    name: "MEGA 확장팩 인페르노X",
    era: "MEGA",
  },
  M1L: {
    code: "M1L",
    name: "MEGA 확장팩 메가브레이브",
    era: "MEGA",
  },
  M1S: {
    code: "M1S",
    name: "MEGA 확장팩 메가심포니아",
    era: "MEGA",
  },

  // =========================
  // Scarlet & Violet
  // =========================
  SV11B: {
    code: "SV11B",
    name: "스칼렛&바이올렛 확장팩 블랙볼트",
    era: "SCARLET_VIOLET",
  },
  SV11W: {
    code: "SV11W",
    name: "스칼렛&바이올렛 확장팩 화이트플레어",
    era: "SCARLET_VIOLET",
  },
  SV10: {
    code: "SV10",
    name: "스칼렛&바이올렛 확장팩 로켓단의 영광",
    era: "SCARLET_VIOLET",
  },
  SV9A: {
    code: "SV9a",
    name: "스칼렛&바이올렛 강화 확장팩 열풍의 아레나",
    era: "SCARLET_VIOLET",
  },
  SV9: {
    code: "SV9",
    name: "스칼렛&바이올렛 확장팩 배틀파트너즈",
    era: "SCARLET_VIOLET",
  },
  SV8A: {
    code: "SV8a",
    name: "스칼렛&바이올렛 하이클래스팩 테라스탈 페스타 ex",
    era: "SCARLET_VIOLET",
  },
  SV8: {
    code: "SV8",
    name: "스칼렛&바이올렛 확장팩 초전브레이커",
    era: "SCARLET_VIOLET",
  },
  SV7A: {
    code: "SV7a",
    name: "스칼렛&바이올렛 강화 확장팩 낙원드래고나",
    era: "SCARLET_VIOLET",
  },
  SV7: {
    code: "SV7",
    name: "스칼렛&바이올렛 확장팩 스텔라미라클",
    era: "SCARLET_VIOLET",
  },
  SV6A: {
    code: "SV6a",
    name: "스칼렛&바이올렛 강화 확장팩 나이트원더러",
    era: "SCARLET_VIOLET",
  },
  SV6: {
    code: "SV6",
    name: "스칼렛&바이올렛 확장팩 변환의 가면",
    era: "SCARLET_VIOLET",
  },
  SV5A: {
    code: "SV5a",
    name: "스칼렛&바이올렛 강화 확장팩 크림슨헤이즈",
    era: "SCARLET_VIOLET",
  },
  SV5K: {
    code: "SV5K",
    name: "스칼렛&바이올렛 확장팩 와일드포스",
    era: "SCARLET_VIOLET",
  },
  SV5M: {
    code: "SV5M",
    name: "스칼렛&바이올렛 확장팩 사이버저지",
    era: "SCARLET_VIOLET",
  },
  SV4A: {
    code: "SV4a",
    name: "스칼렛&바이올렛 하이클래스팩 샤이니트레저 ex",
    era: "SCARLET_VIOLET",
  },
  SV4K: {
    code: "SV4K",
    name: "스칼렛&바이올렛 확장팩 고대의 포효",
    era: "SCARLET_VIOLET",
  },
  SV4M: {
    code: "SV4M",
    name: "스칼렛&바이올렛 확장팩 미래의 일섬",
    era: "SCARLET_VIOLET",
  },
  SV3A: {
    code: "SV3a",
    name: "스칼렛&바이올렛 강화 확장팩 레이징서프",
    era: "SCARLET_VIOLET",
  },
  SV3: {
    code: "SV3",
    name: "스칼렛&바이올렛 확장팩 흑염의 지배자",
    era: "SCARLET_VIOLET",
  },
  SV2A: {
    code: "SV2a",
    name: "스칼렛&바이올렛 강화 확장팩 포켓몬 카드 151",
    era: "SCARLET_VIOLET",
  },
  SV2P: {
    code: "SV2P",
    name: "스칼렛&바이올렛 확장팩 스노해저드",
    era: "SCARLET_VIOLET",
  },
  SV2D: {
    code: "SV2D",
    name: "스칼렛&바이올렛 확장팩 클레이버스트",
    era: "SCARLET_VIOLET",
  },
  SV1A: {
    code: "SV1a",
    name: "스칼렛&바이올렛 강화 확장팩 트리플렛비트",
    era: "SCARLET_VIOLET",
  },
  SV1S: {
    code: "SV1S",
    name: "스칼렛&바이올렛 확장팩 스칼렛 ex",
    era: "SCARLET_VIOLET",
  },
  SV1V: {
    code: "SV1V",
    name: "스칼렛&바이올렛 확장팩 바이올렛 ex",
    era: "SCARLET_VIOLET",
  },

  // =========================
  // Sun & Moon
  // =========================
  SM12A: {
    code: "SM12a",
    name: "썬&문 하이클래스팩 TAG TEAM GX 태그올스타즈",
    era: "SUN_MOON",
  },
  SM12: {
    code: "SM12",
    name: "썬&문 확장팩 얼터제네시스",
    era: "SUN_MOON",
  },
  SM11B: {
    code: "SM11b",
    name: "썬&문 강화 확장팩 드림리그",
    era: "SUN_MOON",
  },
  SM11A: {
    code: "SM11a",
    name: "썬&문 강화 확장팩 리믹스바우트",
    era: "SUN_MOON",
  },
  SM11: {
    code: "SM11",
    name: "썬&문 확장팩 미라클트윈",
    era: "SUN_MOON",
  },
  SM10B: {
    code: "SM10b",
    name: "썬&문 강화 확장팩 스카이레전드",
    era: "SUN_MOON",
  },
  SM10A: {
    code: "SM10a",
    name: "썬&문 강화 확장팩 GG엔드",
    era: "SUN_MOON",
  },
  SM10: {
    code: "SM10",
    name: "썬&문 확장팩 더블블레이즈",
    era: "SUN_MOON",
  },
  SM9B: {
    code: "SM9b",
    name: "썬&문 강화 확장팩 풀메탈월",
    era: "SUN_MOON",
  },
  SM9A: {
    code: "SM9a",
    name: "썬&문 강화 확장팩 나이트유니슨",
    era: "SUN_MOON",
  },
  SM9: {
    code: "SM9",
    name: "썬&문 확장팩 태그볼트",
    era: "SUN_MOON",
  },
  SM8B: {
    code: "SM8b",
    name: "썬&문 하이클래스팩 GX 울트라샤이니",
    era: "SUN_MOON",
  },
  SM8A: {
    code: "SM8a",
    name: "썬&문 강화 확장팩 다크오더",
    era: "SUN_MOON",
  },
  SM8: {
    code: "SM8",
    name: "썬&문 확장팩 제8탄 버스트임팩트",
    era: "SUN_MOON",
  },
  SM7B: {
    code: "SM7b",
    name: "썬&문 강화 확장팩 페어리라이즈",
    era: "SUN_MOON",
  },
  SM7A: {
    code: "SM7a",
    name: "썬&문 강화 확장팩 플라스마 스파크",
    era: "SUN_MOON",
  },
  SM7: {
    code: "SM7",
    name: "썬&문 확장팩 제7탄 창공의 카리스마",
    era: "SUN_MOON",
  },
  SM6B: {
    code: "SM6b",
    name: "썬&문 강화 확장팩 챔피언로드",
    era: "SUN_MOON",
  },
  SM6A: {
    code: "SM6a",
    name: "썬&문 강화 확장팩 드래곤스톰",
    era: "SUN_MOON",
  },
  SM6: {
    code: "SM6",
    name: "썬&문 확장팩 제6탄 금단의 빛",
    era: "SUN_MOON",
  },
  "SM5+": {
    code: "SM5+",
    name: "썬&문 강화 확장팩 울트라포스",
    era: "SUN_MOON",
  },
  SM5M: {
    code: "SM5M",
    name: "썬&문 확장팩 제5탄 울트라문",
    era: "SUN_MOON",
  },
  SM5S: {
    code: "SM5S",
    name: "썬&문 확장팩 제5탄 울트라썬",
    era: "SUN_MOON",
  },
  "SM4+": {
    code: "SM4+",
    name: "썬&문 하이클래스팩 GX 배틀부스트",
    era: "SUN_MOON",
  },
  SM4S: {
    code: "SM4S",
    name: "썬&문 확장팩 제4탄 각성의 용사",
    era: "SUN_MOON",
  },
  SM4A: {
    code: "SM4A",
    name: "썬&문 확장팩 제4탄 초차원의 침략자",
    era: "SUN_MOON",
  },
  "SM3+": {
    code: "SM3+",
    name: "썬&문 강화 확장팩 빛나는 전설",
    era: "SUN_MOON",
  },
  SM3N: {
    code: "SM3N",
    name: "썬&문 확장팩 제3탄 빛을 삼킨 어둠",
    era: "SUN_MOON",
  },
  SM3H: {
    code: "SM3H",
    name: "썬&문 확장팩 제3탄 어둠을 밝힌 무지개",
    era: "SUN_MOON",
  },
  "SM2+": {
    code: "SM2+",
    name: "썬&문 강화 확장팩 새로운 시련",
    era: "SUN_MOON",
  },
  SM2L: {
    code: "SM2L",
    name: "썬&문 확장팩 제2탄 알로라의 달빛",
    era: "SUN_MOON",
  },
  SM2K: {
    code: "SM2K",
    name: "썬&문 확장팩 제2탄 알로라의 햇빛",
    era: "SUN_MOON",
  },
  "SM1+": {
    code: "SM1+",
    name: "강화 확장팩 썬&문",
    era: "SUN_MOON",
  },
  SM1M: {
    code: "SM1M",
    name: "썬&문 확장팩 제1탄 문 컬렉션",
    era: "SUN_MOON",
  },
  SM1S: {
    code: "SM1S",
    name: "썬&문 확장팩 제1탄 썬 컬렉션",
    era: "SUN_MOON",
  },

  // 선택: 썬&문 특수팩
  SMP2: {
    code: "SMP2",
    name: "썬&문 영화 스페셜 팩 명탐정 피카츄",
    era: "SUN_MOON",
  },
} as const;

export type PokemonSetKey = keyof typeof POKEMON_SET_MAP;

export type PokemonSetInfo = {
  code: string;
  name: string;
  era: "MEGA" | "SCARLET_VIOLET" | "SUN_MOON";
};

/**
 * Look up a set by raw OCR / API code. Case-insensitive on the lookup key —
 * we store keys uppercased so "m1l" / "M1L" / "m1L" all hit the same entry.
 * Returns null when the code isn't in our catalog.
 */
export function lookupPokemonSet(code: string | undefined | null): PokemonSetInfo | null {
  if (!code) return null;
  const key = code.toUpperCase().trim() as PokemonSetKey;
  const found = (POKEMON_SET_MAP as Record<string, PokemonSetInfo>)[key];
  return found ?? null;
}
