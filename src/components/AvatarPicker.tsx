'use client';

import { PokemonAvatar } from './PokemonAvatar';
import { AVATARS, type AvatarId } from '@/lib/avatars';

interface Props {
  current: AvatarId;
  onPick: (id: AvatarId) => void;
  onClose: () => void;
}

export function AvatarPicker({ current, onPick, onClose }: Props) {
  return (
    <div className="avatar-overlay" onClick={onClose}>
      <div className="avatar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="avatar-modal-head">
          <span>프로필 캐릭터</span>
          <button type="button" onClick={onClose} aria-label="닫기" className="avatar-close">
            ✕
          </button>
        </div>
        <div className="avatar-modal-hint">잠금된 캐릭터는 조건 달성 시 해제됩니다</div>
        <div className="avatar-grid">
          {AVATARS.map((a) => {
            const isCurrent = a.id === current;
            return (
              <button
                key={a.id}
                type="button"
                className={[
                  'avatar-tile',
                  a.locked ? 'locked' : '',
                  isCurrent ? 'active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => !a.locked && onPick(a.id)}
                disabled={a.locked}
                aria-label={a.name}
              >
                <div className="avatar-tile-img">
                  <PokemonAvatar id={a.id} size={44} />
                </div>
                <div className="avatar-tile-name">{a.name}</div>
                {a.locked && (
                  <div className="avatar-tile-lock">
                    <span className="lock-icon">🔒</span>
                    {a.unlockHint && <span className="lock-hint">{a.unlockHint}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
