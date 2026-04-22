'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { CongBadge } from '@/components/CongBadge';
import { StatusBar } from '@/components/StatusBar';
import type { Place, Trade } from '@/lib/types';

type Pin = { id: string; top: string; left: string };

// task 5에서 Kakao SDK로 교체되면 이 좌표는 실좌표(lat/lng)로 대체
const PINS: Pin[] = [
  { id: 'seongsu',   top: '20%', left: '75%' },
  { id: 'seoulsup',  top: '55%', left: '18%' },
  { id: 'secret',    top: '30%', left: '48%' },
  { id: 'metamong',  top: '38%', left: '80%' },
  { id: 'shoe',      top: '60%', left: '68%' },
  { id: 'rainbow',   top: '78%', left: '35%' },
];

interface Props {
  places: Place[];
  trades: Trade[];
}

export function MapScreen({ places, trades }: Props) {
  const [sel, setSel] = useState<string>(places[0]?.id ?? 'seongsu');
  const selPlace = places.find((p) => p.id === sel) ?? places[0];
  if (!selPlace) return null;

  return (
    <>
      <StatusBar />
      <AppHeader />
      <div className="screen-title-bar">
        <div>
          <h1>장소 지도</h1>
          <div className="sub">핀을 눌러 상세 확인</div>
        </div>
      </div>

      <div className="map-container">
        <svg className="map-svg" viewBox="0 0 360 380" preserveAspectRatio="xMidYMid slice">
          <rect x="0" y="0" width="360" height="380" fill="#EDE8D5" />

          <path d="M0,320 L60,310 L120,330 L200,350 L360,360 L360,380 L0,380 Z" fill="#B9D3E8" />
          <path d="M0,322 L60,312 L120,332 L200,352 L360,362" fill="none" stroke="#7CA9CB" strokeWidth="1" />
          <text className="map-label" x="180" y="372" fontStyle="italic" fill="#4A7A9E">한강</text>

          <rect x="20" y="170" width="130" height="120" fill="#C4DBA8" />
          <path d="M22 172 L148 172 L148 288 L22 288 Z" fill="none" stroke="#8AAE68" strokeWidth="1.5" strokeDasharray="2 3" />
          <circle cx="45"  cy="200" r="4" fill="#7FA85E" />
          <circle cx="70"  cy="215" r="4" fill="#7FA85E" />
          <circle cx="95"  cy="195" r="4" fill="#7FA85E" />
          <circle cx="120" cy="230" r="4" fill="#7FA85E" />
          <circle cx="55"  cy="255" r="4" fill="#7FA85E" />
          <circle cx="100" cy="265" r="4" fill="#7FA85E" />
          <circle cx="130" cy="260" r="4" fill="#7FA85E" />
          <text className="map-label" x="55" y="232" fontWeight="700">서울숲</text>

          <rect x="30"  y="30"  width="70"  height="50" fill="#D9D2BB" />
          <rect x="110" y="30"  width="50"  height="50" fill="#D9D2BB" />
          <rect x="170" y="30"  width="70"  height="35" fill="#D9D2BB" />
          <rect x="250" y="30"  width="90"  height="50" fill="#D9D2BB" />
          <rect x="170" y="75"  width="70"  height="55" fill="#D9D2BB" />
          <rect x="250" y="90"  width="90"  height="40" fill="#D9D2BB" />
          <rect x="170" y="140" width="160" height="50" fill="#D9D2BB" />
          <rect x="170" y="200" width="80"  height="60" fill="#D9D2BB" />
          <rect x="260" y="200" width="80"  height="60" fill="#D9D2BB" />
          <rect x="220" y="270" width="130" height="40" fill="#D9D2BB" />

          <g opacity="0.4">
            <rect x="30"  y="30" width="70"  height="3" fill="#fff" />
            <rect x="110" y="30" width="50"  height="3" fill="#fff" />
            <rect x="170" y="30" width="70"  height="3" fill="#fff" />
            <rect x="250" y="30" width="90"  height="3" fill="#fff" />
            <rect x="170" y="75" width="70"  height="3" fill="#fff" />
            <rect x="250" y="90" width="90"  height="3" fill="#fff" />
            <rect x="170" y="140" width="160" height="3" fill="#fff" />
          </g>

          <line x1="0" y1="15" x2="360" y2="15" stroke="#8A7F56" strokeWidth="2" strokeDasharray="6 4" />
          <text className="map-label-road" x="8" y="11">지하철 2호선</text>

          <rect x="0" y="88" width="360" height="8" fill="#FFFFFF" />
          <line x1="0" y1="92" x2="360" y2="92" stroke="#E6D89A" strokeWidth="1" strokeDasharray="8 6" />
          <text className="map-label-road" x="10" y="86">성수이로</text>

          <rect x="0" y="195" width="360" height="6" fill="#FFFFFF" />
          <text className="map-label-road" x="280" y="193">뚝섬로</text>

          <rect x="155" y="0" width="8" height="320" fill="#FFFFFF" />
          <line x1="159" y1="0" x2="159" y2="320" stroke="#E6D89A" strokeWidth="1" strokeDasharray="8 6" />
          <text className="map-label-road" x="165" y="130" transform="rotate(-90 165 130)">연무장길</text>

          <rect x="247" y="0" width="6" height="320" fill="#FFFFFF" />
          <text className="map-label-road" x="258" y="50" transform="rotate(-90 258 50)">성수대로</text>

          <g>
            <circle cx="295" cy="95" r="7" fill="#fff" stroke="#1A1A2E" strokeWidth="2" />
            <circle cx="295" cy="95" r="3" fill="#4CAF50" />
            <text className="map-label" x="302" y="82" fontSize="8" fontWeight="700">성수역</text>
          </g>
          <g>
            <circle cx="85" cy="170" r="7" fill="#fff" stroke="#1A1A2E" strokeWidth="2" />
            <circle cx="85" cy="170" r="3" fill="#FFB300" />
            <text className="map-label" x="20" y="165" fontSize="8" fontWeight="700">서울숲역</text>
          </g>
          <g>
            <circle cx="40" cy="15" r="7" fill="#fff" stroke="#1A1A2E" strokeWidth="2" />
            <circle cx="40" cy="15" r="3" fill="#4CAF50" />
          </g>
        </svg>

        {PINS.map((pin) => {
          const p = places.find((pl) => pl.id === pin.id);
          if (!p) return null;
          return (
            <button
              key={pin.id}
              type="button"
              className={`map-pin ${p.level} ${sel === pin.id ? 'sel' : ''}`}
              style={{ top: pin.top, left: pin.left }}
              onClick={() => setSel(pin.id)}
            >
              <span>{p.emoji}</span>
            </button>
          );
        })}

        <div className="map-legend">
          <span className="item"><span className="dot-s empty" />여유</span>
          <span className="item"><span className="dot-s normal" />보통</span>
          <span className="item"><span className="dot-s busy" />혼잡</span>
          <span className="item"><span className="dot-s full" />매우혼잡</span>
        </div>
      </div>

      <div className="map-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div className="place-icon" style={{ background: selPlace.bg, width: 40, height: 40 }}>{selPlace.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--f-body)' }}>{selPlace.name}</div>
            <div style={{ fontFamily: 'var(--f-pixel)', fontSize: 7, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.5px' }}>
              {selPlace.mins <= 1 ? '방금 전' : `${selPlace.mins}분 전`} · 제보 {selPlace.count}
            </div>
          </div>
          <CongBadge level={selPlace.level} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" style={{ flex: 1, padding: '8px', background: 'var(--paper-2)', fontFamily: 'var(--f-pixel)', fontSize: 8, letterSpacing: '1px', border: '3px solid var(--ink)', boxShadow: '2px 2px 0 var(--ink)' }}>
            거래 {trades.filter((t) => t.place === selPlace.name).length}건
          </button>
          <button type="button" style={{ flex: 1, padding: '8px', background: 'var(--p-red)', color: 'white', fontFamily: 'var(--f-pixel)', fontSize: 8, letterSpacing: '1px', border: '3px solid var(--ink)', boxShadow: '2px 2px 0 var(--ink)' }}>
            + 제보
          </button>
        </div>
      </div>
      <div style={{ height: 90 }} />
    </>
  );
}
