# 모바일 앱 (mobile/) — 구조·설계 규칙

> Expo/RN 네이티브 앱 (WebView 아님). expo-router 파일 기반 라우팅(`mobile/app/**`).

## 레이어

- `mobile/app/**` — 화면(라우트). 데이터 조립 + 화면 고유 레이아웃만.
- `mobile/src/components/cv/**` — 공통 UI 컴포넌트 (아래 표).
- `mobile/src/services/**` — 외부 API fetcher. `snkrdunk.ts`는 `/shared` re-export shim +
  네이티브 fetcher + 모바일 전용 시세탭 헬퍼(PriceMode 등)만. **파서/시세 규칙 재구현 금지**
  → [architecture-shared.md](./architecture-shared.md).
- `mobile/src/lib/**` — 앱 내부 API(myApi 등) + `/shared` shim들(cardRarity/currency 등, 삭제 금지).

## 공통 UI 컴포넌트 (`src/components/cv/`) — 인라인 복붙 대신 이걸 쓴다

| 컴포넌트 | 용도 |
|---|---|
| `ThumbImage` | 썸네일 — 이미지 or 이모지 폴백. `children` 오버레이 슬롯. (CardThumb.tsx는 CardItem 전용 별개) |
| `SnkrdunkCardTile` | 카드 타일 — `variant='grid'|'row'`, priceText null→'시세 없음', priceChip/accentColor |
| `MarketListRow` | 마켓 가로 행(84×84 썸네일+제목 2줄+가격+메타). `fallbackEmoji`, `rightSlot`(찜 별 등) |
| `ListState` (`LoadingState`/`EmptyState`/`ErrorView`) | 로딩·빈·에러 상태 — 인라인 ActivityIndicator 금지 |
| `SectHd`, `PixelText`, `PixelPress`, `ABtn` 등 | 픽셀 UI 기본 요소 |

## 규칙

1. 테마 색은 `useThemeColors()`(tc)·`useThemeTextVariant()`(txt) 훅으로만. 색 하드코딩 금지.
2. 이미지 많은 비가상화 화면은 Fresco 메모리 고갈 유발 — `resizeMethod="resize"` 필수
   (ThumbImage가 기본 지원).
3. 홈은 `CleanHomeScreen.tsx` 하나 (index.tsx의 LegacyHome 함수는 죽은 참조용).
4. 소셜 로그인은 인앱 WebView 인터셉트 방식 — Google은 WebView에서 차단됨.
5. 테스트는 release 빌드로 (Metro 캐시/내장 번들 스테일 함정 — WSL 에뮬레이터 메모 참조).
6. 새 화면에서 3번째 같은 JSX를 복붙하게 되면 cv/ 컴포넌트로 뽑는다.
