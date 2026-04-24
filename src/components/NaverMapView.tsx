'use client';

import { useEffect, useRef, useState } from 'react';
import { STAMP_SPOTS } from '@/lib/stamps';

/**
 * 네이버 지도 (NCP Maps) — 실제 지도에 6개 스탬프 핀 표시.
 *
 * 환경변수:
 *   NEXT_PUBLIC_NCP_MAP_CLIENT_ID  (필수)
 *
 * NCP 콘솔에서 "Maps (Web)" 상품 신청 후, Application 등록 → Client ID 발급.
 * "서비스 URL" 에 배포 도메인 (예: https://poke-30.com) 을 등록해야 요청이 차단 안 됨.
 *
 * 문서: https://api.ncloud-docs.com/docs/ko/application-maps-overview
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
const SDK_SRC = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${CLIENT_ID}`;

function loadSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('ssr'));
  if (window.naver?.maps) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src^="${SDK_SRC.split('?')[0]}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('sdk load failed')));
      return;
    }
    const s = document.createElement('script');
    s.src = SDK_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('sdk load failed'));
    document.head.appendChild(s);
  });
}

export function NaverMapView({ selNo, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMap | null>(null);
  const markersRef = useRef<NaverMarker[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'nokey'>('loading');

  useEffect(() => {
    if (!CLIENT_ID) {
      setStatus('nokey');
      return;
    }
    let cancelled = false;
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
      .catch(() => { if (!cancelled) setStatus('error'); });

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
          {status === 'error' && '지도를 불러오지 못했어요. 네트워크/Client ID 확인.'}
          {status === 'nokey' && (
            <>
              네이버 지도 키가 설정되지 않았습니다.
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
