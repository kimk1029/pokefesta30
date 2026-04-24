'use client';

import { useEffect, useRef, useState } from 'react';
import { STAMP_SPOTS } from '@/lib/stamps';

/**
 * 네이버 지도 (NCP Web Dynamic Map v3) + 아케이드 픽셀 스탬프 핀.
 *
 * 필수 env:
 *   NEXT_PUBLIC_NCP_MAP_CLIENT_ID  — NCP "Client ID" (SDK URL 파라미터명은 ncpKeyId)
 *
 * 선택 env (2D 픽셀/커스텀 스타일):
 *   NEXT_PUBLIC_NCP_MAP_STYLE_ID   — NAVER Maps Style Editor 에서 발행한 My Style ID
 *   설정하면 GL 서브모듈로 로드되어 해당 스타일이 적용됨.
 *   Style Editor: https://www.ncloud.com/guideCenter/maps
 *
 * 마커는 summary 지도의 stamp-pin 과 동일한 픽셀 디자인 (번호 뱃지 + 이모지 + 검정 사각 박스 쉐도).
 * Geocoder 서브모듈로 주소를 좌표로 변환 → 초기 하드코딩 좌표 보정.
 */

interface Props {
  selNo: number;
  onSelect: (no: number) => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type NMaps = any;
declare global {
  interface Window {
    naver?: { maps: NMaps };
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const CLIENT_ID = process.env.NEXT_PUBLIC_NCP_MAP_CLIENT_ID ?? '';
const STYLE_ID = process.env.NEXT_PUBLIC_NCP_MAP_STYLE_ID ?? '';
const SDK_BASE = 'https://oapi.map.naver.com/openapi/v3/maps.js';
// geocoder: 주소 → 좌표 변환, gl: customStyleId 지원
const SUBMODULES = STYLE_ID ? 'geocoder,gl' : 'geocoder';
const SDK_SRC = `${SDK_BASE}?ncpKeyId=${CLIENT_ID}&submodules=${SUBMODULES}`;

function loadSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('ssr'));
  if (window.naver?.maps) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src^="${SDK_BASE}"]`);
    if (existing) {
      if (window.naver?.maps) { resolve(); return; }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('sdk load failed (existing tag)')));
      return;
    }
    const s = document.createElement('script');
    s.src = SDK_SRC;
    s.async = true;
    s.onload = () => {
      if (window.naver?.maps) {
        resolve();
      } else {
        reject(new Error('SDK loaded but window.naver.maps is undefined — 인증/도메인 확인'));
      }
    };
    s.onerror = () => reject(new Error('script 401/403 or network error'));
    document.head.appendChild(s);
  });
}

/** 스탬프 핀 HTML — summary map 의 .stamp-pin 과 동일한 픽셀 디자인. */
function pinHtml(spot: (typeof STAMP_SPOTS)[number], selected: boolean): string {
  const outline = selected
    // 선택됨: 노란 픽셀 외곽 + 검정 더블 아웃라인
    ? `
      -3px 0 0 #111,3px 0 0 #111,0 -3px 0 #111,0 3px 0 #111,
      0 0 0 4px #FFD23F,
      4px 4px 0 #111
    `
    : `
      -3px 0 0 #111,3px 0 0 #111,0 -3px 0 #111,0 3px 0 #111,
      inset 0 3px 0 rgba(255,255,255,.35),inset 0 -3px 0 rgba(0,0,0,.3),
      4px 4px 0 #111
    `;
  return `
    <div style="
      position:relative;width:44px;height:44px;
      background:${spot.bg};
      display:grid;place-items:center;
      cursor:pointer;border:none;
      box-shadow:${outline};
      ${selected ? 'animation: pf-mk-bob .6s steps(2) infinite;' : ''}
    ">
      <div style="
        position:absolute;top:-8px;left:-8px;
        width:22px;height:22px;
        background:#E63946;color:#fff;
        display:grid;place-items:center;
        font-family:'Press Start 2P','DotGothic16',monospace;
        font-size:11px;z-index:2;
        box-shadow:-1px 0 0 #111,1px 0 0 #111,0 -1px 0 #111,0 1px 0 #111;
      ">${spot.no}</div>
      <span style="font-size:22px;line-height:1;">${spot.emoji}</span>
    </div>
  `;
}

export function NaverMapView({ selNo, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NMaps | null>(null);
  // no → marker
  const markersRef = useRef<Map<number, NMaps>>(new Map());
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'nokey'>('loading');
  const [errDetail, setErrDetail] = useState<string>('');

  useEffect(() => {
    if (!CLIENT_ID) { setStatus('nokey'); return; }
    let cancelled = false;
    console.debug('[NaverMap] SDK src =', SDK_SRC, 'customStyleId =', STYLE_ID || '(none)');

    loadSdk()
      .then(() => {
        if (cancelled || !containerRef.current || !window.naver?.maps) return;
        const naver = window.naver.maps;
        const center = new naver.LatLng(37.5445, 127.0530);
        const map = new naver.Map(containerRef.current, {
          center,
          zoom: 15,
          minZoom: 13,
          maxZoom: 19,
          mapTypeControl: false,
          logoControl: false,
          mapDataControl: false,
          scaleControl: true,
          ...(STYLE_ID ? { gl: true, customStyleId: STYLE_ID } : {}),
        });
        mapRef.current = map;

        STAMP_SPOTS.forEach((spot) => {
          const pos = new naver.LatLng(spot.coord.lat, spot.coord.lng);
          const marker = new naver.Marker({
            position: pos,
            map,
            icon: {
              content: pinHtml(spot, spot.no === selNo),
              size: new naver.Size(44, 44),
              anchor: new naver.Point(22, 22),
            },
          });
          naver.Event.addListener(marker, 'click', () => onSelect(spot.no));
          markersRef.current.set(spot.no, marker);

          // Geocoder 로 주소 → 정확 좌표 (실패해도 초기 coord 유지)
          if (naver.Service?.geocode) {
            naver.Service.geocode({ query: spot.address }, (status: number, res: {
              v2?: { addresses?: Array<{ x: string; y: string }> };
            }) => {
              if (status !== naver.Service.Status.OK) return;
              const first = res?.v2?.addresses?.[0];
              if (!first) return;
              const lat = Number(first.y);
              const lng = Number(first.x);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
              // 5/6번은 같은 주소라 마커 겹침 방지 오프셋 유지
              if (spot.no === 6) {
                marker.setPosition(new naver.LatLng(lat + 0.0003, lng + 0.0003));
              } else {
                marker.setPosition(new naver.LatLng(lat, lng));
              }
            });
          }
        });

        setStatus('ready');
      })
      .catch((e: Error) => {
        if (cancelled) return;
        console.error('[NaverMap] load failed:', e.message);
        setErrDetail(e.message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current.clear();
    };
  }, [onSelect, selNo]);

  // 선택 변경 시 마커 아이콘 다시 그리고 중심 이동
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !window.naver?.maps) return;
    const naver = window.naver.maps;
    markersRef.current.forEach((marker, no) => {
      const spot = STAMP_SPOTS.find((s) => s.no === no);
      if (!spot) return;
      marker.setIcon({
        content: pinHtml(spot, no === selNo),
        size: new naver.Size(44, 44),
        anchor: new naver.Point(22, 22),
      });
    });
    const sel = markersRef.current.get(selNo);
    if (sel) mapRef.current.setCenter(sel.getPosition());
  }, [selNo, status]);

  return (
    <div className="map-wrap">
      <div
        ref={containerRef}
        style={{
          position: 'absolute', inset: 0,
          background: 'var(--pap2)',
          // 실제 네이버 타일은 라스터라 완전 픽셀화는 못 해도, contrast/saturate 로 레트로 분위기
          filter: STYLE_ID ? 'none' : 'contrast(1.08) saturate(1.15)',
        }}
      />
      {status !== 'ready' && (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 20,
            background: 'var(--pap2)', fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink2)',
            textAlign: 'center', lineHeight: 1.7, letterSpacing: 0.3,
          }}
        >
          {status === 'loading' && '🗺 네이버 지도 불러오는 중...'}
          {status === 'error' && (
            <div>
              지도 로드 실패
              <br />
              <span style={{ fontSize: 8, color: 'var(--ink3)' }}>{errDetail}</span>
              <br />
              <span style={{ fontSize: 8, color: 'var(--ink3)' }}>
                NCP Web 서비스 URL 등록 / Client ID 확인
              </span>
            </div>
          )}
          {status === 'nokey' && (
            <>
              네이버 지도 Client ID 가 설정되지 않았습니다.
              <br />
              <span style={{ fontSize: 8, color: 'var(--ink3)' }}>NEXT_PUBLIC_NCP_MAP_CLIENT_ID</span>
            </>
          )}
        </div>
      )}
      <div className="map-legend">
        <span className="mi" style={{ fontFamily: 'var(--f1)', fontSize: 10 }}>실제 지도</span>
      </div>
    </div>
  );
}
