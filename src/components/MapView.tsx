'use client';

import { useState } from 'react';
import { KakaoMapView } from './KakaoMapView';
import { NaverMapView } from './NaverMapView';
import { CongBadge } from './ui/CongBadge';
import { MapButton } from './ui/MapButton';
import { Segmented } from './ui/Segmented';
import { STAMP_SPOTS } from '@/lib/stamps';
import type { Place, Trade } from '@/lib/types';

type MapMode = 'summary' | 'kakao' | 'naver';
const MAP_TABS = [
  { id: 'summary' as const, label: '요약' },
  { id: 'kakao' as const,   label: '카카오' },
  { id: 'naver' as const,   label: '네이버' },
];

/**
 * 스탬프 랠리 6개 지점 좌표 (지도 내 %).
 * 성수 지역 실측 기준:
 *  - 서울숲/서울숲역: 서쪽
 *  - 뚝섬역: 중간 (line2)
 *  - 성수역: 동쪽 (line2)
 *  - 성수동 주택가: 중앙~동쪽
 */
const PIN_POS: Record<number, { top: string; left: string }> = {
  1: { top: '62%', left: '44%' }, // 메타몽 놀이터 / 무지개 어린이공원
  2: { top: '44%', left: '62%' }, // 트렌드 팟 · 올리브영 성수
  3: { top: '64%', left: '76%' }, // 성수 어린이 테마공원
  4: { top: '26%', left: '52%' }, // 뚝섬역
  5: { top: '22%', left: '80%' }, // 성수역
  6: { top: '54%', left: '22%' }, // 서울숲 은행나무길
};

interface Props {
  places: Place[];
  trades: Trade[];
}

export function MapView({ places, trades }: Props) {
  const [selNo, setSelNo] = useState<number>(1);
  const [mode, setMode] = useState<MapMode>('summary');
  const spot = STAMP_SPOTS.find((s) => s.no === selNo) ?? STAMP_SPOTS[0];
  const matchedPlace: Place | undefined = places.find((p) => p.id === spot.placeId);

  return (
    <>
      <div style={{ margin: '0 var(--gap) 10px' }}>
        <Segmented items={MAP_TABS} value={mode} onChange={setMode} />
      </div>

      {mode === 'kakao' ? (
        <KakaoMapView selNo={selNo} onSelect={setSelNo} />
      ) : mode === 'naver' ? (
        <NaverMapView selNo={selNo} onSelect={setSelNo} />
      ) : (
      <div className="map-wrap">
        <svg
          className="map-svg"
          viewBox="0 0 360 340"
          preserveAspectRatio="xMidYMid slice"
        >
          <rect width="360" height="340" fill="#EDE8D5" />
          <path d="M0,285 L60,275 L120,295 L200,315 L360,325 L360,340 L0,340 Z" fill="#B9D3E8" />
          <text style={{ font: 'italic 9px DotGothic16', fill: '#4A7A9E' }} x="170" y="335">
            한강
          </text>

          <rect x="20" y="150" width="120" height="100" fill="#C4DBA8" />
          <circle cx="45" cy="175" r="5" fill="#7FA85E" />
          <circle cx="75" cy="190" r="5" fill="#7FA85E" />
          <circle cx="105" cy="172" r="5" fill="#7FA85E" />
          <circle cx="125" cy="205" r="5" fill="#7FA85E" />
          <circle cx="55" cy="228" r="5" fill="#7FA85E" />
          <text style={{ font: 'bold 10px DotGothic16', fill: '#2E5A1B' }} x="50" y="210">
            서울숲
          </text>

          <rect x="30" y="22" width="65" height="45" fill="#D9D2BB" />
          <rect x="105" y="22" width="48" height="45" fill="#D9D2BB" />
          <rect x="165" y="22" width="65" height="30" fill="#D9D2BB" />
          <rect x="245" y="22" width="88" height="45" fill="#D9D2BB" />
          <rect x="165" y="65" width="65" height="48" fill="#D9D2BB" />
          <rect x="245" y="80" width="88" height="35" fill="#D9D2BB" />
          <rect x="165" y="128" width="155" height="45" fill="#D9D2BB" />
          <rect x="165" y="185" width="78" height="52" fill="#D9D2BB" />
          <rect x="255" y="185" width="78" height="52" fill="#D9D2BB" />
          <rect x="215" y="248" width="128" height="35" fill="#D9D2BB" />

          <line x1="0" y1="12" x2="360" y2="12" stroke="#8A7F56" strokeWidth="2" strokeDasharray="6 4" />
          <text style={{ font: '8px DotGothic16', fill: '#6B6A5A' }} x="8" y="9">
            지하철 2호선
          </text>
          <rect x="0" y="78" width="360" height="7" fill="#FFF" />
          <line x1="0" y1="81" x2="360" y2="81" stroke="#E6D89A" strokeWidth="1" strokeDasharray="8 6" />
          <text style={{ font: '8px DotGothic16', fill: '#6B6A5A' }} x="8" y="75">
            성수이로
          </text>
          <rect x="0" y="178" width="360" height="6" fill="#FFF" />
          <text style={{ font: '8px DotGothic16', fill: '#6B6A5A' }} x="272" y="175">
            뚝섬로
          </text>
          <rect x="152" y="0" width="7" height="285" fill="#FFF" />
          <line x1="155" y1="0" x2="155" y2="285" stroke="#E6D89A" strokeWidth="1" strokeDasharray="8 6" />
          <rect x="244" y="0" width="6" height="285" fill="#FFF" />

          <g>
            <circle cx="292" cy="84" r="7" fill="#fff" stroke="#1A1A2E" strokeWidth="2" />
            <circle cx="292" cy="84" r="3" fill="#4CAF50" />
            <text style={{ font: 'bold 9px DotGothic16', fill: '#1A1A2E' }} x="298" y="72">
              성수역
            </text>
          </g>
          <g>
            <circle cx="84" cy="152" r="7" fill="#fff" stroke="#1A1A2E" strokeWidth="2" />
            <circle cx="84" cy="152" r="3" fill="#FFB300" />
            <text style={{ font: 'bold 9px DotGothic16', fill: '#1A1A2E' }} x="10" y="148">
              서울숲역
            </text>
          </g>
        </svg>

        {STAMP_SPOTS.map((s) => {
          const pos = PIN_POS[s.no] ?? { top: '50%', left: '50%' };
          const isSel = s.no === selNo;
          return (
            <button
              key={s.no}
              type="button"
              className={`map-pin stamp-pin${isSel ? ' sel' : ''}`}
              style={{ top: pos.top, left: pos.left, background: s.bg }}
              onClick={() => setSelNo(s.no)}
              aria-label={`${s.no}번 ${s.name}`}
            >
              <span className="stamp-pin-num">{s.no}</span>
              <span className="stamp-pin-emoji">{s.emoji}</span>
            </button>
          );
        })}

        <div className="map-legend">
          <span className="mi" style={{ fontFamily: 'var(--f1)', fontSize: 10 }}>
            스탬프 1~6
          </span>
        </div>
      </div>
      )}

      <div className="map-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            className="p-icon"
            style={{
              background: spot.bg,
              width: 44,
              height: 44,
              fontSize: 20,
              position: 'relative',
            }}
          >
            {spot.emoji}
            <div
              style={{
                position: 'absolute',
                top: -6,
                left: -6,
                width: 20,
                height: 20,
                display: 'grid',
                placeItems: 'center',
                background: 'var(--red)',
                color: 'var(--white)',
                fontFamily: 'var(--f1)',
                fontSize: 10,
                boxShadow:
                  '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
              }}
            >
              {spot.no}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--f1)', fontSize: 11, letterSpacing: 0.5 }}>
              {spot.name}
            </div>
            {spot.subtitle && (
              <div
                style={{
                  fontFamily: 'var(--f1)',
                  fontSize: 8,
                  color: 'var(--ink3)',
                  marginTop: 4,
                  letterSpacing: 0.3,
                }}
              >
                {spot.subtitle}
              </div>
            )}
            {matchedPlace && (
              <div
                style={{
                  fontFamily: 'var(--f1)',
                  fontSize: 7,
                  color: 'var(--ink3)',
                  marginTop: 4,
                  letterSpacing: 0.3,
                }}
              >
                제보 {matchedPlace.count} · {matchedPlace.mins <= 1 ? '방금 전' : `${matchedPlace.mins}분 전`}
              </div>
            )}
          </div>
          {matchedPlace && <CongBadge level={matchedPlace.level} size="small" />}
        </div>
        <div className="map-btn-row">
          <MapButton variant="sec">
            거래 {trades.filter((t) => matchedPlace && t.place === matchedPlace.name).length}건
          </MapButton>
          <MapButton
            variant="pri"
            onClick={() =>
              (window.location.href = matchedPlace
                ? '/write/feed?kind=report'
                : '/write/feed')
            }
          >
            + 제보
          </MapButton>
        </div>
      </div>
    </>
  );
}
