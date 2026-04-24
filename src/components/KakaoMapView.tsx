'use client';

import { useEffect, useRef, useState } from 'react';
import { STAMP_SPOTS } from '@/lib/stamps';

interface Props {
  selNo: number;
  onSelect: (no: number) => void;
}

declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (cb: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        Map: new (el: HTMLElement, opts: { center: unknown; level: number }) => KakaoMapInstance;
        Marker: new (opts: { position: unknown; map?: KakaoMapInstance; image?: unknown }) => KakaoMarker;
        MarkerImage: new (src: string, size: unknown, opts?: { offset?: unknown }) => unknown;
        Size: new (w: number, h: number) => unknown;
        Point: new (x: number, y: number) => unknown;
        event: {
          addListener: (target: unknown, type: string, handler: () => void) => void;
        };
      };
    };
  }
}

interface KakaoMapInstance {
  setCenter: (pos: unknown) => void;
  setLevel: (level: number) => void;
}
interface KakaoMarker {
  setMap: (m: KakaoMapInstance | null) => void;
}

const KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? '';
const SDK_SRC = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false`;

function loadSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('ssr'));
  if (window.kakao?.maps) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
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

export function KakaoMapView({ selNo, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markersRef = useRef<KakaoMarker[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'nokey'>('loading');

  useEffect(() => {
    if (!KEY) {
      setStatus('nokey');
      return;
    }
    let cancelled = false;
    loadSdk()
      .then(() => {
        if (cancelled) return;
        window.kakao!.maps.load(() => {
          if (cancelled || !containerRef.current) return;
          const center = new window.kakao!.maps.LatLng(37.5443, 127.0530);
          const map = new window.kakao!.maps.Map(containerRef.current, {
            center,
            level: 4,
          });
          mapRef.current = map;

          STAMP_SPOTS.forEach((spot) => {
            const pos = new window.kakao!.maps.LatLng(spot.coord.lat, spot.coord.lng);
            const marker = new window.kakao!.maps.Marker({ position: pos, map });
            markersRef.current.push(marker);
            window.kakao!.maps.event.addListener(marker, 'click', () => onSelect(spot.no));
          });

          setStatus('ready');
        });
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [onSelect]);

  // 선택된 스팟으로 지도 중심 이동
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !window.kakao?.maps) return;
    const spot = STAMP_SPOTS.find((s) => s.no === selNo);
    if (!spot) return;
    const pos = new window.kakao.maps.LatLng(spot.coord.lat, spot.coord.lng);
    mapRef.current.setCenter(pos);
  }, [selNo, status]);

  return (
    <div className="map-wrap">
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0, background: 'var(--pap2)' }}
      />
      {status !== 'ready' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            padding: 20,
            background: 'var(--pap2)',
            fontFamily: 'var(--f1)',
            fontSize: 10,
            color: 'var(--ink2)',
            textAlign: 'center',
            lineHeight: 1.7,
            letterSpacing: 0.3,
          }}
        >
          {status === 'loading' && '🗺 지도 불러오는 중...'}
          {status === 'error' && '지도를 불러오지 못했어요. 네트워크를 확인해주세요.'}
          {status === 'nokey' && (
            <>
              카카오 지도 키가 설정되지 않았습니다.
              <br />
              <span style={{ fontSize: 8, color: 'var(--ink3)' }}>
                NEXT_PUBLIC_KAKAO_MAP_KEY
              </span>
            </>
          )}
        </div>
      )}
      <div className="map-legend">
        <span className="mi" style={{ fontFamily: 'var(--f1)', fontSize: 10 }}>
          실제 지도
        </span>
      </div>
    </div>
  );
}
