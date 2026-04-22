# 포케페스타30

포켓몬 30주년 메가페스타 잉어킹 프로모 실시간 현황 허브 (모바일 웹).
Next.js 14 App Router + TypeScript + Supabase.

## 세팅

```bash
npm install
cp .env.local.example .env.local   # 값 채우기
npm run dev                        # http://localhost:3000
```

### .env.local 값 받기

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  → https://supabase.com/dashboard → 프로젝트 생성 → Settings → API
- `NEXT_PUBLIC_KAKAO_MAP_KEY` (task 5용, 그 전엔 빈값 OK)
  → https://developers.kakao.com → 앱 생성 → JavaScript 키

### Supabase 스키마 적용

Supabase 대시보드 → SQL Editor → `supabase/schema.sql` 내용 붙여넣고 실행.

## 구조

```
src/
├── app/
│   ├── layout.tsx         # 루트 HTML + 폰 쉘 + Tabbar
│   ├── globals.css        # 픽셀 스타일
│   ├── page.tsx           # / 홈
│   ├── live/page.tsx      # /live 실시간 현황
│   ├── trade/page.tsx     # /trade 거래 (삽니다/팝니다)
│   ├── report/page.tsx    # /report 제보
│   ├── map/page.tsx       # /map 지도
│   └── my/page.tsx        # /my 마이페이지
├── components/
│   ├── Tabbar.tsx         # 하단 5탭 + FAB
│   ├── StatusBar.tsx      # 상단 HUD
│   ├── AppHeader.tsx      # 로고/알림
│   ├── CongBadge.tsx      # 혼잡도 뱃지
│   ├── Pixel{Karp,Ball}.tsx  # SVG 도트 아트
│   ├── PixIcon.tsx        # 탭 픽셀 아이콘
│   └── screens/           # 6화면 본체
└── lib/
    ├── supabase.ts        # Supabase 클라이언트 (env 없으면 null 반환)
    ├── data.ts            # mock PLACES/TRADES/FEED (task 2에서 교체)
    └── types.ts
```

## 진행 상태

- [x] **Task 1** Next.js + Supabase 기반 + UI 포팅
- [ ] **Task 2** Supabase 백엔드 연동 — mock 데이터 → 실 쿼리
- [ ] **Task 3** 히어로 공식 비주얼 교체 — 이미지 에셋 필요
- [ ] **Task 4** Supabase Realtime 실시간 피드
- [ ] **Task 5** Kakao Maps SDK 연동 — JS 키 + 좌표 필요
