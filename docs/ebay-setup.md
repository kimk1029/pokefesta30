# eBay API 연동 — 시세 차트 Setup

## 1. eBay 개발자 계정 / 앱 생성

1. <https://developer.ebay.com/signin> 에서 eBay 계정으로 로그인.
2. <https://developer.ebay.com/my/keys> 로 이동해 **Production** 키셋 발급.
   - 발급 직후에는 Sandbox 키가 먼저 보이니, 상단 탭을 **Production** 으로 전환.
   - "App ID (Client ID)" 와 "Cert ID (Client Secret)" 값을 복사.
3. (선택) 다른 마켓플레이스 (`EBAY_GB`, `EBAY_DE` 등) 사용 시 해당 마켓 권한 승인 필요 — 기본 `EBAY_US` 는 별도 승인 없이 즉시 사용.

## 2. 환경변수 설정

로컬 개발: `.env.local` 에 추가

```env
EBAY_CLIENT_ID=YourAppIdHere
EBAY_CLIENT_SECRET=YourCertIdHere
EBAY_MARKETPLACE_ID=EBAY_US
EBAY_ENV=production   # 또는 sandbox (sandbox 는 별도 sandbox 키셋 필요)
```

배포(Vercel/서버): 호스팅 환경변수에 동일 키 추가 후 재배포.

## 3. DB 마이그레이션

`CardPriceSnapshot` + `OripaTicket` 모델이 새로 추가되었습니다. 테이블 생성 필요:

```bash
# 개발 환경
npx prisma migrate dev --name add_card_price_snapshot

# 스테이징/프로덕션
npx prisma migrate deploy
```

## 4. 동작 확인

앱 실행 후 `/cards` 방문:

- 키가 정상 설정되어 있으면 상단의 노란 경고 박스가 사라지고, 카드별 가격이 실제 eBay 호가로 표시됩니다.
- 첫 방문 시 각 카드에 대해 한 번씩 eBay Browse API 호출이 일어납니다(8종 기준 ~1초).
- 이후 10분간은 DB 스냅샷이 재사용되어 eBay 호출이 발생하지 않습니다.
- 차트는 스냅샷이 2개 이상 쌓이면 트렌드 라인이 표시됩니다 (시간이 지날수록 풍부해짐).

## 5. 검색 쿼리 튜닝

카드별 eBay 검색어는 `src/lib/cardsCatalog.ts` 에서 관리합니다:

```ts
{ id: 'magikarp-holo', name: '잉어킹 홀로', ebayQuery: 'magikarp holo pokemon card' }
```

- 결과가 부적절하면 `ebayQuery` 를 수정하세요. 따옴표 포함 문구, 제외어(`-foo`) 등 eBay 검색 문법 지원.
- 한국 발매 포켓몬 카드라도 eBay 매물은 대부분 영어 상품명으로 등록되어 있으므로 **영문 검색어 권장**.

## 6. 히스토리 차트 빠르게 채우기 (선택)

`CardPriceSnapshot` 은 10분마다 조회 시점에만 누적됩니다.  
히스토리 차트를 더 빠르게 채우려면 cron 으로 주기 호출을 걸면 됩니다:

```bash
# Vercel Cron 예시 (vercel.json)
{
  "crons": [
    { "path": "/api/cards/cron/snapshot", "schedule": "0 * * * *" }
  ]
}
```

또는 모든 카드를 순회하는 간단한 스크립트를 외부 cron(GitHub Actions 등)으로 실행:

```bash
for id in magikarp-holo charizard-base pikachu-promo rainbow-rare eevee-dev gold-secret mewtwo-v sticker-pack; do
  curl -s "https://<your-host>/api/cards/${id}/price" > /dev/null
done
```

(필요 시 `src/app/api/cards/cron/snapshot/route.ts` 를 추가해 일괄 스냅샷 엔드포인트를 만들 수 있음 — 현재 미구현.)

## 7. Rate Limit / 비용

- Production 기본 한도: **5,000 req/day** per App ID.
- 본 구현은 카드 8종 × 10분 캐시 기준으로 **하루 ~1,152 req**. 여유 충분.
- 사용량은 <https://developer.ebay.com/my/analytics> 에서 모니터링.

## 8. 한계 / 주의

- **체결가(sold price) 아님.** Browse API 는 현재 노출 중인 "호가" 기반이라 실제 거래가와 다를 수 있습니다. 체결가가 필요하면 **Marketplace Insights API** 가 별도 신청(한정 액세스)으로 필요합니다.
- `EBAY_MARKETPLACE_ID=EBAY_KR` 은 존재하지 않습니다. 한국 거래는 eBay 로 커버 불가 — 번개장터 등은 공식 API 없음.
- 가격 단위는 `EBAY_MARKETPLACE_ID` 의 기본 통화(`USD`/`GBP`/`EUR`)로 반환됩니다. 앱 UI 는 통화 기호를 그대로 표시.
