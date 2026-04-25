'use client';

import { useEffect, useRef, useState } from 'react';
import { STAMP_SPOTS } from '@/lib/stamps';

/**
 * 네이버 지도 (NCP Web Dynamic Map v3) + 아케이드 픽셀 스탬프 핀.
 * - 주소는 Geocoder 로 정확 좌표 보정 (하드코딩 좌표는 fallback)
 * - 로드/보정 후 fitBounds 로 6 스팟 전부 화면에 들어오게 자동 프레이밍
 * - navigator.geolocation 으로 내 위치 파랑 점 표시 (HTTPS 필수)
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
      if (window.naver?.maps) resolve();
      else reject(new Error('SDK loaded but window.naver.maps is undefined — 인증/도메인 확인'));
    };
    s.onerror = () => reject(new Error('script 401/403 or network error'));
    document.head.appendChild(s);
  });
}

/** 스탬프 핀 HTML — 이전 버전에서 50% 축소 (44→22, 뱃지 22→12, 이모지 22→12) */
function pinHtml(spot: (typeof STAMP_SPOTS)[number], selected: boolean): string {
  const outline = selected
    ? `
      -2px 0 0 #111,2px 0 0 #111,0 -2px 0 #111,0 2px 0 #111,
      0 0 0 2px #FFD23F,
      2px 2px 0 #111
    `
    : `
      -2px 0 0 #111,2px 0 0 #111,0 -2px 0 #111,0 2px 0 #111,
      inset 0 2px 0 rgba(255,255,255,.35),inset 0 -2px 0 rgba(0,0,0,.3),
      2px 2px 0 #111
    `;
  return `
    <div style="
      position:relative;width:22px;height:22px;
      background:${spot.bg};
      display:grid;place-items:center;
      cursor:pointer;border:none;
      box-shadow:${outline};
      ${selected ? 'animation: pf-mk-bob .6s steps(2) infinite;' : ''}
    ">
      <div style="
        position:absolute;top:-5px;left:-5px;
        width:12px;height:12px;
        background:#E63946;color:#fff;
        display:grid;place-items:center;
        font-family:'Press Start 2P','DotGothic16',monospace;
        font-size:7px;line-height:1;z-index:2;
        box-shadow:-1px 0 0 #111,1px 0 0 #111,0 -1px 0 #111,0 1px 0 #111;
      ">${spot.no}</div>
      <span style="font-size:12px;line-height:1;">${spot.emoji}</span>
    </div>
  `;
}

/** 내 위치 파랑 점 — 펄스 링 포함 */
const MY_LOC_HTML = `
  <div style="position:relative;width:20px;height:20px;">
    <div style="
      position:absolute;inset:0;border-radius:50%;
      background:rgba(59,130,246,.25);
      animation:pf-loc-pulse 1.6s ease-out infinite;
    "></div>
    <div style="
      position:absolute;top:50%;left:50%;
      width:12px;height:12px;border-radius:50%;
      background:#3B82F6;border:2px solid #fff;
      transform:translate(-50%,-50%);
      box-shadow:0 1px 3px rgba(0,0,0,.4);
    "></div>
  </div>
`;

export function NaverMapView({ selNo, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NMaps | null>(null);
  const markersRef = useRef<Map<number, NMaps>>(new Map());
  const meMarkerRef = useRef<NMaps | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'nokey'>('loading');
  const [errDetail, setErrDetail] = useState<string>('');

  useEffect(() => {
    if (!CLIENT_ID) { setStatus('nokey'); return; }
    let cancelled = false;
    console.debug('[NaverMap] SDK src =', SDK_SRC);

    loadSdk()
      .then(() => {
        if (cancelled || !containerRef.current || !window.naver?.maps) return;
        const naver = window.naver.maps;

        // 초기에도 6 스팟 근사좌표 기준으로 bounds 계산해 fitBounds
        const initialBounds = new naver.LatLngBounds();
        STAMP_SPOTS.forEach((s) => initialBounds.extend(new naver.LatLng(s.coord.lat, s.coord.lng)));

        const map = new naver.Map(containerRef.current, {
          bounds: initialBounds,
          minZoom: 11,
          maxZoom: 19,
          mapTypeControl: false,
          logoControl: false,
          mapDataControl: false,
          scaleControl: false,
          zoomControl: true,
          zoomControlOptions: { position: naver.Position.TOP_RIGHT, style: naver.ZoomControlStyle.SMALL },
          ...(STYLE_ID ? { gl: true, customStyleId: STYLE_ID } : {}),
        });
        mapRef.current = map;

        // 마커 생성
        STAMP_SPOTS.forEach((spot) => {
          const pos = new naver.LatLng(spot.coord.lat, spot.coord.lng);
          const marker = new naver.Marker({
            position: pos,
            map,
            icon: {
              content: pinHtml(spot, spot.no === selNo),
              size: new naver.Size(22, 22),
              anchor: new naver.Point(11, 11),
            },
          });
          naver.Event.addListener(marker, 'click', () => onSelect(spot.no));
          markersRef.current.set(spot.no, marker);
        });

        // Geocoder — 전체 스팟 주소 보정 후 한 번 더 fitBounds
        const refineAll = async () => {
          if (!naver.Service?.geocode) return;
          const tasks = STAMP_SPOTS.map(
            (spot) =>
              new Promise<void>((resolve) => {
                naver.Service.geocode(
                  { query: spot.address },
                  (s: number, res: { v2?: { addresses?: Array<{ x: string; y: string }> } }) => {
                    if (s === naver.Service.Status.OK) {
                      const a = res?.v2?.addresses?.[0];
                      const lat = a ? Number(a.y) : NaN;
                      const lng = a ? Number(a.x) : NaN;
                      if (Number.isFinite(lat) && Number.isFinite(lng)) {
                        const m = markersRef.current.get(spot.no);
                        if (m) {
                          // 5/6번 같은 주소 → 6번 작은 오프셋 유지
                          const finalLat = spot.no === 6 ? lat + 0.0003 : lat;
                          const finalLng = spot.no === 6 ? lng + 0.0003 : lng;
                          m.setPosition(new naver.LatLng(finalLat, finalLng));
                        }
                      }
                    }
                    resolve();
                  },
                );
              }),
          );
          await Promise.all(tasks);
          // 보정 끝나면 재 프레이밍
          if (!cancelled && mapRef.current) {
            const b = new naver.LatLngBounds();
            markersRef.current.forEach((m) => b.extend(m.getPosition()));
            mapRef.current.fitBounds(b, { top: 40, right: 30, bottom: 40, left: 30 });
          }
        };
        refineAll().catch(() => {});

        // 내 위치
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (cancelled || !mapRef.current || !window.naver?.maps) return;
              const nmap = window.naver.maps;
              const me = new nmap.LatLng(pos.coords.latitude, pos.coords.longitude);
              meMarkerRef.current = new nmap.Marker({
                position: me,
                map: mapRef.current,
                icon: {
                  content: MY_LOC_HTML,
                  size: new nmap.Size(20, 20),
                  anchor: new nmap.Point(10, 10),
                },
                zIndex: 100,
              });
            },
            (err) => {
              console.debug('[NaverMap] geolocation:', err.message);
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
          );
        }

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
      if (meMarkerRef.current) {
        meMarkerRef.current.setMap(null);
        meMarkerRef.current = null;
      }
    };
  }, [onSelect, selNo]);

  // selNo 변경 → 아이콘 재렌더 (팬 이동은 안 함: 전체 핀을 한 번에 보여주는 게 우선)
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !window.naver?.maps) return;
    const naver = window.naver.maps;
    markersRef.current.forEach((marker, no) => {
      const spot = STAMP_SPOTS.find((s) => s.no === no);
      if (!spot) return;
      marker.setIcon({
        content: pinHtml(spot, no === selNo),
        size: new naver.Size(22, 22),
        anchor: new naver.Point(11, 11),
      });
    });
  }, [selNo, status]);

  return (
    <div className="map-wrap">
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--pap2)',
          filter: STYLE_ID ? 'none' : 'contrast(1.08) saturate(1.15)',
        }}
      />
      {status !== 'ready' && (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 20,
            background: 'var(--pap2)', fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink2)',
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
        <span className="mi" style={{ fontFamily: 'var(--f1)', fontSize: 9 }}>실제 지도</span>
      </div>
    </div>
  );
}
