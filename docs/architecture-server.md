# NAS 서버 (server/) — 구조·설계 규칙

> Express + tsx. pm2 `pokefesta30-server`(:3030, fork 모드, node 직접 실행 — npm 래퍼 금지).
> main push 시 deploy-server.yml로 자동 배포. **안티봇 스크레이퍼(KREAM 등)는 반드시 여기**
> (Vercel IP는 차단됨).

## 레이어

- `server/index.js` — 엔트리. 라우터 mount + 부팅 스케줄러 기동. 에러 핸들러는 항상 마지막.
- `server/routes/**` — HTTP 라우트. 응답 후 DB 적재는 `void (async…)` 백그라운드로(응답 지연 금지).
- `server/lib/**` — DB 헬퍼·스케줄러·스크레이퍼. `@/lib/*` alias로 `src/lib`(웹 shim 경유
  `/shared` 정본)를 그대로 공유 — **서버에서 시세/파싱 로직 재구현 금지**
  → [architecture-shared.md](./architecture-shared.md).

## 데이터 원칙 (스니덩크 시세)

- 카탈로그(불변 정보) = `snkrdunk_cards` (가격 필드 없음). 가격 = `snkrdunk_price_snapshots`
  append-only, 현재가 = 최신 행. 조회는 DB 우선 + TTL(컬렉션 30분 / 팩 24h).
- **일일 배치**: `lib/dailyPriceSnapshot.ts` — 매일 03:00 KST 전 카탈로그 순회 스냅샷
  (멱등: 오늘치 있으면 스킵, 부팅 5분 후 캐치업). 통계 API:
  `GET /api/snkrdunk/apparels/:id/price-stats` (KST 일별 + 1/7/30일 평균),
  상태: `GET /api/snkrdunk/daily-snapshot-status`.
- 등록가/등락률은 등급 기준 통일 — `shared/snkrdunkPrice.ts`의 registerBasisJpy가 정본.

## 스케줄러 패턴

단일 인스턴스 전제의 in-process 타이머 (별도 크론 인프라 없음):
- `priceAlerts.ts` — 15분 interval, 가격알림 체크
- `cardImageCache.js` — 부팅+매일, 카드 이미지 webp 셀프 CDN 워밍
- `dailyPriceSnapshot.ts` — 매일 정각(KST) 체인 setTimeout
새 주기 작업도 이 패턴으로: `start*Scheduler()` export → index.js listen 콜백에서 기동,
타이머 `unref()`, 겹침 방지 플래그, env로 on/off.

## 규칙

1. KST 날짜 계산은 `shared/kst.ts`만 사용 (재구현 금지).
1. **shared 정본 심볼은 `/shared` 에서 직접 import** — `@/lib/*` shim 의 `export *` 를
   거치면 tsx CJS interop(cjs-module-lexer)이 이름을 못 봐 NAS 부팅이 죽는다.
   shim 에 로컬 선언된 fetcher(`fetchSnkrdunk*` 등)만 `@/lib/*` 로 가져올 것.
2. DB 쓰기 실패는 삼키고 로깅 — 사용자 응답을 죽이지 않는다.
3. 배포 후 스모크는 `https://www.poke-30.com/api/...` 프록시로 (poke-30.com은 www로 308).
4. 이 개발 박스에는 DATABASE_URL 없음 — DB는 NAS/Vercel에만. 로컬 검증은 임시 Postgres로.
