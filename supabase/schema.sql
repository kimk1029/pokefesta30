-- ============================================================
-- Pokefesta30 — Supabase schema (task 2에서 연동)
-- Supabase SQL Editor에 그대로 붙여넣어 실행.
-- 혼잡도(places.level)는 뷰로 파생 — 원본 테이블에는 보존하지 않음.
-- ============================================================

-- 장소 마스터
create table if not exists public.places (
  id         text primary key,
  name       text not null,
  emoji      text not null,
  bg         text not null,
  lat        double precision,
  lng        double precision,
  created_at timestamptz not null default now()
);

-- 혼잡도 제보 (FEED + PLACES.level/mins/count의 원천)
create table if not exists public.reports (
  id         bigserial primary key,
  place_id   text not null references public.places(id) on delete cascade,
  level      text not null check (level in ('empty','normal','busy','full')),
  note       text,
  author     text,           -- 익명 닉네임 또는 auth.users.id
  created_at timestamptz not null default now()
);
create index if not exists reports_place_time_idx
  on public.reports (place_id, created_at desc);

-- 거래 (삽니다/팝니다)
create table if not exists public.trades (
  id         bigserial primary key,
  type       text not null check (type in ('buy','sell')),
  title      text not null,
  body       text,
  place_id   text not null references public.places(id),
  price      text,
  author     text,
  created_at timestamptz not null default now()
);
create index if not exists trades_time_idx
  on public.trades (created_at desc);

-- ============================================================
-- 장소별 최신 혼잡도 뷰
--   · 최근 30분 내 제보만 집계
--   · level은 최신 제보 1건 기준(단순) — 가중치 알고리즘은 추후 개선
-- ============================================================
create or replace view public.place_status as
with latest as (
  select distinct on (place_id)
    place_id,
    level,
    created_at
  from public.reports
  where created_at >= now() - interval '30 minutes'
  order by place_id, created_at desc
),
counts as (
  select place_id, count(*)::int as count
  from public.reports
  where created_at >= now() - interval '30 minutes'
  group by place_id
)
select
  p.id,
  p.name,
  p.emoji,
  p.bg,
  p.lat,
  p.lng,
  coalesce(l.level, 'empty') as level,
  coalesce(c.count, 0)       as count,
  l.created_at               as last_report_at
from public.places p
left join latest l on l.place_id = p.id
left join counts c on c.place_id = p.id;

-- ============================================================
-- RLS — 읽기는 공개, 쓰기는 인증된 사용자(또는 anon 허용)
-- ============================================================
alter table public.places  enable row level security;
alter table public.reports enable row level security;
alter table public.trades  enable row level security;

create policy "places_read_public"  on public.places  for select using (true);
create policy "reports_read_public" on public.reports for select using (true);
create policy "trades_read_public"  on public.trades  for select using (true);

-- 익명 제보 허용 정책 (원하면 auth.uid() is not null로 강화)
create policy "reports_insert_any" on public.reports for insert with check (true);
create policy "trades_insert_any"  on public.trades  for insert with check (true);

-- ============================================================
-- 시드: 6개 장소 (좌표는 task 5 지도 연동 시점에 실좌표로 업데이트)
-- ============================================================
insert into public.places (id, name, emoji, bg) values
  ('seongsu',  '성수역 부근',       '🚇', '#E63946'),
  ('seoulsup', '서울숲역 부근',     '🌳', '#4ADE80'),
  ('secret',   '시크릿 포레스트',   '🌲', '#3A5BD9'),
  ('metamong', '메타몽 놀이터',     '🎪', '#FFD23F'),
  ('shoe',     '구두테마공원',       '👟', '#FB923C'),
  ('rainbow',  '무지개어린이공원',   '🌈', '#F7F3E3')
on conflict (id) do nothing;
