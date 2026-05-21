# CardVault 로드맵 — Collectr 한국 버전

> **포지션**: 한국 TCG 컬렉터를 위한 포트폴리오 관리·거래·그레이딩 통합 플랫폼.
> **벤치마크**: [Collectr](https://getcollectr.com) (글로벌, 2M+ MAU, 25+ TCG)
> **차별화 축**: 한국 시장 특화 + 자체 그레이딩 엔진 + 일본판 데이터 정확도

---

## 1. 현재 위치 (2026-05 기준)

| 영역 | 상태 | 비고 |
|---|---|---|
| 홈 대시보드 | ✅ | Claude Design 핸드오프 기반 리빌드 완료 |
| 카드 스캔 (이미지→OCR) | ✅ | PaddleOCR + GPT-4o vision 듀얼 |
| 카드 수동 입력 | ✅ | `/cards/add` |
| 카드 매칭/조회 | ✅ | TCGdex JA → EN → 로컬 cards.json (13장) |
| 그레이딩 엔진 | ✅ | consensus detector (color + edge + saturation) |
| 포트폴리오 라인차트 | ✅ | UI 골격, 데이터 보강 필요 |
| 트레이딩/커뮤니티 | ✅ | 골격 |
| 4통화 가격 (EUR/USD/JPY/KRW) | ✅ | `server/lib/lookup.js` 환율 변환 |
| **시계열 가격 데이터** | ⚠️ | `CardPriceSnapshot` 테이블 존재. 현재는 **eBay 응답 캐시**(10분 TTL) 용도 — 진짜 시계열 아님 |
| **카탈로그 규모** | ❌ | 13장 (Collectr 1M+ 대비) |
| 수익화 (PRO/마켓플레이스) | ❌ | 미정 |

→ **70% 골격 완성, 가격 시계열·카탈로그·수익화가 결정적 갭**.

---

## 2. P0 — 가격 히스토리 + 차트 (다음 2~4주)

### 2.1 현재 무엇이 부족한가

`CardPriceSnapshot` 테이블은 이미 좋은 모양이지만, **실제 동작은 "10분 캐시"** 입니다 (스키마 주석: *"10분 이내 스냅샷이면 재사용, 그 이상이면 새로 fetch 후 한 줄 추가"*).

문제:
- 사용자가 **조회한 카드만** 스냅샷이 쌓임 → 인기 카드만 데이터 풍부, 롱테일은 비어있음
- 조회 패턴에 따라 **시간 간격이 들쭉날쭉** → 차트가 톱니 모양
- 사용자가 7일 차트를 봤는데 데이터가 없으면 **빈 화면** UX

### 2.2 목표 상태

> "임의의 등록된 카드를 클릭하면 즉시 6M / 1Y / All 차트가 뜬다."

### 2.3 변경 사항

**(a) 데이터 모델 보강**

현재 `CardPriceSnapshot`은 eBay 결과(`low/avg/high/median/sampleN`)를 가정. TCGdex `cardmarket.avg`도 같이 저장하려면 `source` 컬럼이 필요:

```prisma
model CardPriceSnapshot {
  id        Int      @id @default(autoincrement())
  cardId    String
  source    String   // 'ebay' | 'cardmarket' | 'tcgplayer' | 'snkrdunk' | 'manual'
  currency  String   @default("USD")
  low       Float?
  avg       Float
  high      Float?
  median    Float?
  sampleN   Int?
  fetchedAt DateTime @default(now())

  @@index([cardId, source, fetchedAt(sort: Desc)])
  @@index([cardId, fetchedAt(sort: Desc)])
  @@map("card_price_snapshots")
}
```

**(b) 정기 스냅샷 워커**

- 트리거: **하루 1회 cron** (UTC 03:00 ≈ KST 12:00, 마켓 상대적 한산)
- 대상: **사용자가 1번 이상 등록·즐겨찾기한 카드** (전체 1M+ 카드를 매일 찍을 필요 없음, 지갑 연동된 것만)
- 소스: TCGdex `pricing.cardmarket.avg` 1차, eBay Browse API 2차
- 실패 처리: 재시도 3회 → 실패 카드 로그 → 슬랙/이메일 알림
- 운영: PM2 ecosystem(`ecosystem.config.cjs`)에 워커 등록 또는 Vercel Cron

**(c) 차트 UX**

- **카드 상세 페이지**: 6M / 1Y / All 토글, KRW 환산값 표시
- **포트폴리오**: 카드별 보유수량 × 일별 시세 → 일별 합계 차트 (현재 라인차트 데이터 보강)
- **변동 표시**: "최근 7일 +12%" 같은 단순 비교 위젯

**(d) 부분 백필**

- 가능한 카드 (TCGdex `pricing.cardmarket.avg7 / avg30`이 있으면) → 그걸로 7일/30일 점 2개 만들어서 **차트 빈 시작점 보완**
- 없으면 "데이터 수집 중" 플레이스홀더

### 2.4 KPI

- 1주 운영 후: 등록된 카드의 **80%가 일별 시세 1점 이상** 확보
- 카드 상세 차트 평균 로드 < 500ms (DB 쿼리 + 클라이언트 렌더)
- 빈 차트 노출률 < 5%

---

## 3. 카드 데이터 전략 — pokemon-tcg-data 활용

### 3.1 검토 대상

[`PokemonTCG/pokemon-tcg-data`](https://github.com/PokemonTCG/pokemon-tcg-data) — 17,000+ 카드 / 100+ 세트의 **공개 JSON 데이터셋**.

| 장점 | 한계 |
|---|---|
| 무료, 공개, API 키 불필요 | **영어판만** (한국·일본판 카드는 없음) |
| 풍부한 메타 (HP, 기술, 약점, 일러스트, 도감번호) | 가격 데이터 **없음** (이미지 URL만) |
| 이미지 CDN(`images.pokemontcg.io`) 안정적 | 신규 일본판 누락 → 한국 시장과 어긋남 |
| 라이선스 자유 (단 포켓몬 IP는 TPCi) | 빈티지/구판은 풍부, 모던 일본 한정판은 약함 |

### 3.2 권장 전략: **하이브리드 (현재 방식 유지 + 영어판 보강)**

```
┌────────────────────────────────────────────────────┐
│ 우선순위 1: TCGdex JA  (한국·일본 카드 메인)       │
│            ↓ miss                                  │
│ 우선순위 2: TCGdex EN  (영어판 모던)              │
│            ↓ miss                                  │
│ 우선순위 3: pokemon-tcg-data 로컬 DB ★ 신규       │
│            ↓ miss                                  │
│ 우선순위 4: cards.json (한국어 이름·KRW 시세)     │
└────────────────────────────────────────────────────┘
```

→ **한국 시장 메인은 그대로 TCGdex JA**. pokemon-tcg-data는 **영어판 빈티지/구판 백필** 용도.

### 3.3 도입 절차

**(a) 일회성 시드 import**

```bash
# 신규 스크립트
server/scripts/seed-from-pokemon-tcg-data.ts
```

```ts
// 의사코드
const REPO = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master';
const sets = await fetch(`${REPO}/sets/en.json`).then(r => r.json());

for (const set of sets) {
  const cards = await fetch(`${REPO}/cards/en/${set.id}.json`).then(r => r.json());
  await prisma.cardCatalog.createMany({
    data: cards.map(c => ({
      id: c.id,                    // "base1-1"
      setCode: set.id,             // "base1"
      number: c.number,            // "1"
      name: c.name,
      rarity: c.rarity,
      imageSmall: c.images.small,
      imageLarge: c.images.large,
      hp: c.hp ? Number(c.hp) : null,
      types: c.types ?? [],
      source: 'pokemon-tcg-data',
      lang: 'en',
      raw: c,                      // 전체 JSON 보존 — 나중에 필드 추가 시 재시드 불필요
    })),
    skipDuplicates: true,
  });
}
```

**선결 작업**:
- `prisma/schema.prisma`에 `CardCatalog` 모델 추가 (지금은 외부 lookup만 있고 자체 카탈로그 없음)
- `source` 필드로 `'tcgdex' | 'pokemon-tcg-data' | 'manual'` 구분

**(b) 주간 동기화**

- Weekly cron으로 `git ls-remote` → master HEAD SHA 비교 → 변경 있으면 diff만 upsert
- 새 세트 출시 빈도 약 6~8주, 부담 적음

### 3.4 이미지 호스팅 결정

옵션:
- (A) `images.pokemontcg.io` 직접 hotlink — 무료, 안정적, 그러나 외부 의존
- (B) **Vercel Blob에 미러링** — 비용 발생, 그러나 자체 도메인·CDN 제어 가능
- (C) 하이브리드 — 첫 조회 시 lazy 미러링

→ **권장: (A) 시작 → 트래픽 늘면 (C)로 전환**.

### 3.5 라이선스 메모

- 데이터 자체: 사실상 자유 사용 (라이선스 명시 없음, 커뮤니티 합의)
- 포켓몬 IP: 닌텐도/Game Freak/Creatures Inc./TPCi 소유
- **상업화(PRO 구독, 거래 수수료) 단계에서는 한국 TPCi 라이선스/팬 게임 가이드라인 사전 검토 필수**

---

## 4. 단계별 로드맵

| Phase | 기간 | 목표 | 산출물 |
|---|---|---|---|
| **Phase 1** | 지금~2주 | 가격 시계열 인프라 | `source` 컬럼 마이그레이션, 일일 cron 워커, 백필 스크립트 |
| **Phase 2** | 2~4주 | 차트 UX | 카드 상세 6M/1Y/All 차트, 포트폴리오 일별 합계 차트, 변동률 위젯 |
| **Phase 3** | 4~6주 | pokemon-tcg-data import | `CardCatalog` 테이블, 시드 스크립트, 주간 동기화 cron, 검색 인덱스 |
| **Phase 4** | 6~8주 | PRO 구독 모델 | Free vs PRO 라인 정의, Toss/카카오페이 연동, paywall UI |
| **Phase 5** | 8~12주 | 마켓플레이스 | 사용자간 매물 등록·매칭·결제 에스크로, 거래 수수료 |
| **Phase 6** | 12주+ | 한국 특화 강화 | SNKRDUNK/번개장터 시세 연동, 한글 OCR 학습 데이터 보강, 대회·이벤트 캘린더 |

---

## 5. 리스크 / 의사결정 보류 사항

| 리스크 | 완화 |
|---|---|
| TCGdex API 다운 시 전체 lookup 실패 | pokemon-tcg-data 로컬 DB가 백업 역할 (Phase 3 이후) |
| Collectr 한국 진출 | 자체 그레이딩·한국 결제·KRW 시세 등 한국 특화 해자(moat)에 투자 |
| 포켓몬 IP 라이선스 이슈 | Phase 4 진입 전 법무 검토. 그 전까진 "팬 메이드 도구" 포지션 유지 |
| 카탈로그 규모 vs Collectr (13장 vs 1M+) | Phase 3에서 17,000+ 영어판 흡수, JA는 TCGdex 의존 유지 |
| 한국어 OCR 정확도 | PaddleOCR 한글 모델 fine-tune 데이터 수집 — 사용자 스캔 결과 옵트인 수집 |

## 6. 미결 의사결정

**다음 대화에서 정해야 할 것**:

1. **카탈로그 테이블 스키마** — `CardCatalog`를 새로 만들지, `UserCard`에 더 많은 필드를 넣을지
2. **이미지 호스팅** — 직접 hotlink vs Vercel Blob 미러링 (트래픽 추정 필요)
3. **PRO 가격** — Collectr 벤치마크 ($4.99/월) 그대로 vs 한국 시장 조정 (₩4,900~6,900/월)
4. **마켓플레이스 수수료** — 0% 출시 vs 처음부터 3~5%
5. **그레이딩 엔진의 위치** — 무료 유지 vs PRO 전용 (현재 차별화 포인트라 고민됨)
