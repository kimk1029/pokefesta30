#!/usr/bin/env python3
"""
픽셀 포켓볼 + ARVOTCG 로고를 PIL 로 그려서 app icon / splash 를 생성.
출력:
  mobile/assets/icon.png          (1024x1024)
  mobile/assets/adaptive-icon.png (1024x1024, 안드로이드 적응형: 안전영역 중앙 ~66%)
  mobile/assets/splash.png        (1242x2436, 중앙 정렬)
  mobile/assets/favicon.png       (48x48 — 웹용)

색상 팔레트는 mobile/src/theme/tokens.ts 와 동일.
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'assets'
OUT.mkdir(parents=True, exist_ok=True)

# Palette (mobile/src/theme/tokens.ts 기준)
INK = (26, 26, 46)         # var(--ink)
RED = (230, 57, 70)        # var(--red)
RED_LT = (255, 100, 112)
WHITE = (255, 255, 255)
GOLD = (255, 210, 63)      # var(--gold)
GOLD_DK = (217, 158, 0)
PAPER = (232, 223, 184)    # splash bg

def draw_pokeball(draw: ImageDraw.ImageDraw, cx: int, cy: int, radius: int):
    """픽셀 룩 포켓볼. 격자 단위 = radius / 5."""
    r = radius
    # 외곽 검정 원
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=INK)
    inner_r = int(r * 0.92)
    # 위쪽 빨강 반원
    draw.pieslice((cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r),
                  start=180, end=360, fill=RED)
    # 아래쪽 흰색 반원
    draw.pieslice((cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r),
                  start=0, end=180, fill=WHITE)
    # 가운데 검정 띠
    band_h = max(2, int(r * 0.14))
    draw.rectangle((cx - inner_r, cy - band_h, cx + inner_r, cy + band_h), fill=INK)
    # 가운데 버튼: 외곽 검정 → 흰색 → 검정 점
    btn_outer = int(r * 0.30)
    btn_white = int(r * 0.22)
    btn_dot = int(r * 0.08)
    draw.ellipse((cx - btn_outer, cy - btn_outer, cx + btn_outer, cy + btn_outer), fill=INK)
    draw.ellipse((cx - btn_white, cy - btn_white, cx + btn_white, cy + btn_white), fill=WHITE)
    draw.ellipse((cx - btn_dot, cy - btn_dot, cx + btn_dot, cy + btn_dot), fill=INK)
    # 좌상단 하이라이트 — 픽셀 룩 (작은 사각형 두 개)
    hl = max(2, int(r * 0.06))
    hx, hy = cx - int(r * 0.5), cy - int(r * 0.45)
    draw.rectangle((hx, hy, hx + hl * 2, hy + hl), fill=RED_LT)
    draw.rectangle((hx + hl, hy - hl, hx + hl * 2, hy), fill=RED_LT)

# ── icon.png : 1024 × 1024 ──────────────────────────────────────────────
icon = Image.new('RGBA', (1024, 1024), (15, 23, 42, 255))  # ink2 비슷 어두운 남색
d = ImageDraw.Draw(icon)
# 픽셀 룩: 코너에 노란 브래킷
br_thick = 28
br_len = 130
def _rect_sorted(d, x0, y0, x1, y1, fill):
    d.rectangle((min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)), fill=fill)

for cx, cy, hx_dir, hy_dir in [(60, 60, 1, 1), (964, 60, -1, 1), (60, 964, 1, -1), (964, 964, -1, -1)]:
    _rect_sorted(d, cx, cy, cx + hx_dir * br_len, cy + hy_dir * br_thick, GOLD)
    _rect_sorted(d, cx, cy, cx + hx_dir * br_thick, cy + hy_dir * br_len, GOLD)
draw_pokeball(d, 512, 512, 360)
icon.save(OUT / 'icon.png')
print(f'wrote {OUT / "icon.png"}')

# ── adaptive-icon.png : Android 안전영역(중앙 66%) 활용 ─────────────────
adapt = Image.new('RGBA', (1024, 1024), (15, 23, 42, 255))
d = ImageDraw.Draw(adapt)
draw_pokeball(d, 512, 512, 320)
adapt.save(OUT / 'adaptive-icon.png')
print(f'wrote {OUT / "adaptive-icon.png"}')

# ── favicon.png : 48 × 48 (웹) ──────────────────────────────────────────
fav = Image.new('RGBA', (96, 96), (15, 23, 42, 255))
d = ImageDraw.Draw(fav)
draw_pokeball(d, 48, 48, 40)
fav.resize((48, 48), Image.LANCZOS).save(OUT / 'favicon.png')
print(f'wrote {OUT / "favicon.png"}')

# ── splash.png : 1242 × 2436 (iPhone X급 기준 — Expo가 자동 스케일) ─────
from PIL import ImageFont
PIXEL_FONT_PATH = OUT.parent / 'node_modules' / '@expo-google-fonts' / 'press-start-2p' / '400Regular' / 'PressStart2P_400Regular.ttf'
KO_FONT_PATH = OUT / 'fonts' / 'Galmuri11-Bold.ttf'

splash = Image.new('RGBA', (1242, 2436), PAPER + (255,))
d = ImageDraw.Draw(splash)
# 중앙에 포켓볼
draw_pokeball(d, 621, 1050, 300)

# "ARVOTCG" — Press Start 2P (영문 픽셀 폰트)
title_font = ImageFont.truetype(str(PIXEL_FONT_PATH), 92)
title = 'ARVOTCG'
bbox = d.textbbox((0, 0), title, font=title_font)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]
# 그림자 효과 — 4방향 검정 외곽 + 본체 금색
tx = 621 - tw // 2
ty = 1480
for ox, oy in [(-6, 0), (6, 0), (0, -6), (0, 6), (-4, -4), (4, 4), (-4, 4), (4, -4)]:
    d.text((tx + ox, ty + oy), title, font=title_font, fill=INK)
d.text((tx, ty), title, font=title_font, fill=GOLD)

# 한국어 부제 — Galmuri11 Bold
sub_font = ImageFont.truetype(str(KO_FONT_PATH), 42)
sub = '포켓몬 카드 컬렉터 허브'
sub_bbox = d.textbbox((0, 0), sub, font=sub_font)
sw = sub_bbox[2] - sub_bbox[0]
sx = 621 - sw // 2
sy = ty + th + 60
d.text((sx, sy), sub, font=sub_font, fill=INK)

splash.save(OUT / 'splash.png')
print(f'wrote {OUT / "splash.png"}')

print('done')
