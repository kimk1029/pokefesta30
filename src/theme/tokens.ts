/**
 * 포케페스타30 — 디자인 토큰 (CardVault 통합)
 * 웹 globals.css :root 변수와 1:1 매핑.
 */

export const colors = {
  red: '#E63946',
  redLt: '#FF6470',
  redDk: '#8F1620',
  yel: '#FFD23F',
  yelLt: '#FFE987',
  yelDk: '#B88400',
  /** CardVault gold (yel 별칭 — 의미 명확화용) */
  gold: '#FFD23F',
  goldLt: '#FFE987',
  goldDk: '#B88400',
  blu: '#3A5BD9',
  bluLt: '#7A94FF',
  bluDk: '#1B2E89',
  grn: '#22C55E',
  grnLt: '#86EFAC',
  grnDk: '#14532D',
  orn: '#F97316',
  ornLt: '#FED7AA',
  ornDk: '#7C2D12',
  pur: '#7C3AED',
  purLt: '#A78BFA',
  purDk: '#4C1D95',
  pnk: '#EC4899',
  pnkLt: '#F9A8D4',
  pnkDk: '#831843',
  teal: '#0D9488',
  nav: '#1B2E89',
  navLt: '#2E4ACA',
  navDk: '#0D1A5A',
  ink: '#0F172A',
  ink2: '#1E293B',
  ink3: '#475569',
  ink4: '#94A3B8',
  bg: '#F8F4E8',
  paper: '#F8F4E8',
  pap2: '#EFE9D0',
  pap3: '#E0D8BB',
  papdk: '#9B8E68',
  white: '#FFFFFF',
  /** Rarity */
  rCommon: '#6B7490',
  rUncommon: '#22C55E',
  rRare: '#3A5BD9',
  rSr: '#7C3AED',
  rHr: '#EC4899',
  rSecret: '#FFD23F',
  /** PSA grade */
  psa10: '#FFD700',
  psa9: '#C0C0C0',
  psa8: '#CD7F32',
  psa7: '#94A3B8',
};

export const fonts = {
  pixel: 'PressStart2P_400Regular',
  ko: 'Galmuri11',
  koBold: 'Galmuri11_Bold',
} as const;

export const space = {
  gap: 14,
  cg: 12,
};

/** 웹의 픽셀 박스 그림자 패턴을 RN에서 흉내내는 헬퍼. */
export const pixelBoxShadow = {
  borderWidth: 3,
  borderColor: colors.ink,
};
