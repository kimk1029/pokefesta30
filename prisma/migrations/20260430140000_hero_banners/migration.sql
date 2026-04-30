-- HeroBanner: 홈 상단 슬라이더 배너 — 어드민 편집 가능
CREATE TABLE IF NOT EXISTS "hero_banners" (
  "id"          SERIAL PRIMARY KEY,
  "sortOrder"   INTEGER     NOT NULL DEFAULT 0,
  "slideClass"  TEXT        NOT NULL DEFAULT 'slide-a',
  "badge"       TEXT        NOT NULL,
  "title"       TEXT        NOT NULL,
  "sub"         TEXT        NOT NULL,
  "ctaHint"     TEXT,
  "visualType"  TEXT        NOT NULL DEFAULT 'emoji',
  "visualValue" TEXT        NOT NULL DEFAULT '✨',
  "onClick"     TEXT,
  "active"      BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "hero_banners_active_sortOrder_idx"
  ON "hero_banners" ("active", "sortOrder");

-- 현재 하드코딩된 4개 배너 시드 (HeroSlider.tsx 기준)
INSERT INTO "hero_banners" ("sortOrder", "slideClass", "badge", "title", "sub", "ctaHint", "visualType", "visualValue", "onClick", "active")
VALUES
  (10, 'slide-a', '★ 팬 프로젝트',      E'잉어킹\n프로모!',     E'성수 6곳 스탬프 랠리\n탭해서 이벤트 상세 보기', '👉 TAP', 'image', '/promo/magikarp-promo.png', 'stamp-rally', TRUE),
  (20, 'slide-b', '⚡ 실시간 거래 활성', E'삽니다\n팝니다',       E'성수 현장 직거래\n장소 태그로 빠르게 연결',     NULL,    'emoji', '💬', NULL,           TRUE),
  (30, 'slide-c', '📢 30초 제보',       E'지금\n제보하기',       E'방금 본 현장 상황을\n다른 트레이너에게 알려주세요', NULL,   'emoji', '📢', NULL,           TRUE),
  (40, 'slide-d', '🎴 오리파 뽑기',     E'한정 카드\n뽑기!',     E'S급 카드를 뽑을 기회\n탭해서 지금 도전',         '👉 TAP', 'emoji', '🎴', 'oripa',        TRUE)
ON CONFLICT DO NOTHING;
