# 웹 (src/) — 구조·설계 규칙

> Next.js App Router. Vercel 배포(main push 시 자동). `/api/*`는 로컬 라우트가 없으면 NAS로 프록시.

## 레이어

- `src/app/**` — 라우트(page/layout/route). 페이지는 데이터 조립만, 반복 UI는 컴포넌트로.
- `src/components/**` — 재사용 컴포넌트.
- `src/lib/**` — 웹 fetcher + `/shared` re-export shim. **순수 로직을 여기 새로 만들지 말 것**
  → [architecture-shared.md](./architecture-shared.md) 참조.

## 공통 UI 컴포넌트 — 새 화면 만들 때 인라인 복붙 대신 이걸 쓴다

| 컴포넌트 | 용도 |
|---|---|
| `CardThumb` | 카드 썸네일 — 이미지 or 🃏 이모지 폴백. `children`으로 랭크배지 등 오버레이 |
| `PackGridCard` | 세로 카드 타일(63/88 이미지 + 2줄 제목 + 가격칩). `flat`(clean 테마), `actions` 슬롯 |
| `PriceChip` | 가격 칩 (값 있으면 ink/gold, 없으면 pap2/ink3) |
| `pixelBorder.ts` `PIXEL_BORDER` | 1px 픽셀 보더 box-shadow 문자열 — 리터럴 재작성 금지 |
| 기존: `Panel`, `Price`, `SectionTitle`, `AppBar`, `HeroSlider` 등 | 화면 작성 전 components/ 먼저 훑을 것 |

## 규칙

1. **비슷한 JSX 블록을 3번째 복붙하게 되면 그 시점에 컴포넌트로 뽑는다** (variant는 props).
2. 테마는 CSS 변수(`var(--ink)` 등)로만 — 컴포넌트에 색 하드코딩 금지.
   테마 추가/변경은 memory의 theme-system 규칙 참조 (--ink/--white 오버로드 주의).
3. `<Panel href>` 안의 버튼은 stopPropagation이 안 먹는다 — `Panel onClick`+router.push 사용.
4. 홈은 모든 테마가 `dashboard/CleanHome.tsx` 하나 (DashboardScreen은 타입 제공용으로만 살아있음).
5. 죽은 코드를 발견해도 **importer 0 확인 없이 삭제 금지** (2026-07 전수조사에서
   "죽은 줄 알았던" DashboardScreen·PortfolioHero가 실사용으로 판명).
