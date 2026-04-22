import type { ReactNode } from 'react';
import { PixelBall } from './PixelBall';

export function AppHeader({ right }: { right?: ReactNode }) {
  return (
    <div className="app-header">
      <div className="logo">
        <PixelBall size={24} />
        <span>포케30</span>
      </div>
      {right || (
        <button className="icon-btn" aria-label="notifications">
          <svg width="14" height="14" viewBox="0 0 10 10" style={{ shapeRendering: 'crispEdges' }}>
            <rect x="4" y="1" width="2" height="1" fill="#1A1A2E" />
            <rect x="3" y="2" width="4" height="1" fill="#1A1A2E" />
            <rect x="2" y="3" width="6" height="1" fill="#1A1A2E" />
            <rect x="2" y="4" width="6" height="2" fill="#1A1A2E" />
            <rect x="1" y="6" width="8" height="1" fill="#1A1A2E" />
            <rect x="4" y="8" width="2" height="1" fill="#1A1A2E" />
          </svg>
        </button>
      )}
    </div>
  );
}
