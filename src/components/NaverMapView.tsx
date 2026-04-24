'use client';

import { useEffect, useRef, useState } from 'react';
import { STAMP_SPOTS } from '@/lib/stamps';

/**
 * 네이버 지도 (NCP Web Dynamic Map v3) — 6개 스탬프 핀 표시.
 *
 * 환경변수:
 *   NEXT_PUBLIC_NCP_MAP_CLIENT_ID  = NCP 콘솔에서 발급받은 "Client ID"
 *   (※ NCP 콘솔에서는 "Client ID" 로 표시되지만, 실제 SDK URL 파라미터명은 ncpKeyId 임)
 *
 * NCP 설정 체크리스트:
 *   1) console.ncloud.com → Services → AI·Application Service → Maps → 이용신청
 *   2) Application 등록 (신규 등록):
 *        - 서비스 종류: Web Dynamic Map 체크
 *        - 서비스 환경: Web → "URL" 에 https://poke-30.com / https://www.poke-30.com /
 *          http://localhost:3000 세 줄 모두 등록 (도메인 불일치면 401)
 *   3) 등록 후 "인증 정보" 에서 Client ID 복사 → Vercel env 에 붙이기
 *
 * 공식 예제:
 *   https://github.com/navermaps/maps.js.ncp/blob/master/index.html
 */

interface Props {
  selNo: number;
  onSelect: (no: number) => void;
}

declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (el: HTMLElement, opts: { center: unknown; zoom: number }) => NaverMap;
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (opts: { position: unknown; map: NaverMap; title?: string }) => NaverMarker;
        Event: {
          addListener: (target: unknown, type: string, handler: () => void) => void;
        };
      };
    };
  }
}

interface NaverMap {
  setCenter: (pos: unknown) => void;
}
interface NaverMarker {
  setMap: (m: NaverMap | null) => void;
}

const CLIENT_ID = process.env.NEXT_PUBLIC_NCP_MAP_CLIENT_ID ?? '';
// ⚠ 파라미터 이름: ncpKeyId (공식 SDK 파라미터명). NCP 콘솔 라벨은 "Client ID" 인데 파라미터는 keyId 다.
const SDK_BASE = 'https://oapi.map.naver.com/openapi/v3/maps.js';
const SDK_SRC = `${SDK_BASE}?ncpKeyId=${CLIENT_ID}`;

function loadSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('ssr'));
  if (window.naver?.maps) return Promise.resolve();
  return new Promise((resolve, reject) => {
    // 같은 도메인으로 이미 <script> 가 있는지 확인 — 재주입 방지
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
      // 로드 후 window.naver.maps 가 실제로 있는지 확인 — 인증 실패면 없음
      if (window.naver?.maps) {
        resolve();
      } else {
        reject(new Error('SDK loaded but window.naver.maps is undefined — 인증/도메인 오류 가능성'));
      }
    };
    s.onerror = () => reject(new Error('script 401/403 or network error'));
    document.head.appendChild(s);
  });
}

export function NaverMapView({ selNo, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMap | null>(null);
  const markersRef = useRef<NaverMarker[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'nokey'>('loading');
  const [errDetail, setErrDetail] = useState<string>('');

  useEffect(() => {
    if (!CLIENT_ID) {
      setStatus('nokey');
      return;
    }
    let cancelled = false;
    console.debug('[NaverMap] SDK src =', SDK_SRC);
    loadSdk()
      .then(() => {
        if (cancelled || !containerRef.current || !window.naver?.maps) return;
        const center = new window.naver.maps.LatLng(37.5443, 127.053);
        const map = new window.naver.maps.Map(containerRef.current, { center, zoom: 15 });
        mapRef.current = map;

        STAMP_SPOTS.forEach((spot) => {
          const pos = new window.naver!.maps.LatLng(spot.coord.lat, spot.coord.lng);
          const marker = new window.naver!.maps.Marker({ position: pos, map, title: `${spot.no}. ${spot.name}` });
          markersRef.current.push(marker);
          window.naver!.maps.Event.addListener(marker, 'click', () => onSelect(spot.no));
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
      markersRef.current = [];
    };
  }, [onSelect]);

  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !window.naver?.maps) return;
    const spot = STAMP_SPOTS.find((s) => s.no === selNo);
    if (!spot) return;
    const pos = new window.naver.maps.LatLng(spot.coord.lat, spot.coord.lng);
    mapRef.current.setCenter(pos);
  }, [selNo, status]);

  return (
    <div className="map-wrap">
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, background: 'var(--pap2)' }} />
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
                NCP 콘솔 → Web 서비스 URL 등록 확인
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
        <span className="mi" style={{ fontFamily: 'var(--f1)', fontSize: 10 }}>네이버 지도</span>
      </div>
    </div>
  );
}
