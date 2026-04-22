import type { ReactNode } from 'react';
import { PixelBall } from '../PixelBall';
import { BackButton } from './BackButton';

interface Props {
  title?: string;
  backHref?: string;
  showBack?: boolean;
  right?: ReactNode;
}

export function AppBar({ title, backHref, showBack, right }: Props) {
  return (
    <div className="appbar">
      {showBack ? (
        <BackButton href={backHref} />
      ) : (
        <div className="appbar-logo">
          <PixelBall size={22} />
          <span>포케30</span>
        </div>
      )}
      <div className="appbar-title">{title ?? ''}</div>
      {right ?? <div style={{ width: 34 }} />}
    </div>
  );
}
