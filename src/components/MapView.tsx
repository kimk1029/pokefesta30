'use client';

import { useState } from 'react';
import { CongBadge } from './ui/CongBadge';
import { MapButton } from './ui/MapButton';
import type { CongestionLevel, Place, Trade } from '@/lib/types';

type PinId = string;

interface Pin {
  id: PinId;
  top: string;
  left: string;
}

const PINS: Pin[] = [
  { id: 'seongsu', top: '20%', left: '76%' },
  { id: 'seoulsup', top: '55%', left: '16%' },
  { id: 'secret', top: '30%', left: '48%' },
  { id: 'metamong', top: '38%', left: '82%' },
  { id: 'shoe', top: '60%', left: '68%' },
  { id: 'rainbow', top: '78%', left: '34%' },
];

const PIN_CLS: Record<CongestionLevel, string> = {
  empty: 'pe',
  normal: 'pn',
  busy: 'pb',
  full: 'pf',
};

interface Props {
  places: Place[];
  trades: Trade[];
}

export function MapView({ places, trades }: Props) {
  const first = places[0]?.id ?? 'seongsu';
  const [sel, setSel] = useState<string>(first);
  const selPlace = places.find((p) => p.id === sel) ?? places[0];

  if (!selPlace) return null;

  return (
    <>
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

          <g opacity={0.4}>
            <rect x="30" y="22" width="65" height="3" fill="#fff" />
            <rect x="105" y="22" width="48" height="3" fill="#fff" />
            <rect x="165" y="22" width="65" height="3" fill="#fff" />
            <rect x="245" y="22" width="88" height="3" fill="#fff" />
            <rect x="165" y="65" width="65" height="3" fill="#fff" />
            <rect x="245" y="80" width="88" height="3" fill="#fff" />
            <rect x="165" y="128" width="155" height="3" fill="#fff" />
          </g>

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

        {PINS.map((pin) => {
          const p = places.find((pl) => pl.id === pin.id);
          if (!p) return null;
          return (
            <button
              key={pin.id}
              type="button"
              className={`map-pin ${PIN_CLS[p.level]} ${sel === pin.id ? 'sel' : ''}`}
              style={{ top: pin.top, left: pin.left }}
              onClick={() => setSel(pin.id)}
              aria-label={p.name}
            >
              {p.emoji}
            </button>
          );
        })}

        <div className="map-legend">
          {(
            [
              ['e', '여유'],
              ['n', '보통'],
              ['b', '혼잡'],
              ['f', '매우혼잡'],
            ] as const
          ).map(([l, lb]) => (
            <span key={l} className="mi">
              <span className={`ldot ${l}`} />
              {lb}
            </span>
          ))}
        </div>
      </div>

      <div className="map-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            className="p-icon"
            style={{ background: selPlace.bg, width: 42, height: 42, fontSize: 26 }}
          >
            {selPlace.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--f1)', fontSize: 14, letterSpacing: '.5px' }}>
              {selPlace.name}
            </div>
            <div
              style={{
                fontFamily: 'var(--f1)',
                fontSize: 10,
                color: 'var(--ink3)',
                marginTop: 5,
                letterSpacing: '.5px',
              }}
            >
              {selPlace.mins <= 1 ? '방금 전' : `${selPlace.mins}분 전`} · 제보 {selPlace.count}
            </div>
          </div>
          <CongBadge level={selPlace.level} size="small" />
        </div>
        <div className="map-btn-row">
          <MapButton variant="sec">
            거래 {trades.filter((t) => t.place === selPlace.name).length}건
          </MapButton>
          <MapButton variant="pri" onClick={() => (window.location.href = '/report')}>
            + 제보
          </MapButton>
        </div>
      </div>
    </>
  );
}
