'use client';

import { useState } from 'react';
import { AvatarPicker } from './AvatarPicker';
import { PokemonAvatar } from './PokemonAvatar';
import { useAvatar } from '@/lib/use-avatar';

export function ProfileAvatarClient({ size = 44 }: { size?: number }) {
  const { id, set } = useAvatar();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="avatar-hit"
        aria-label="프로필 캐릭터 변경"
        style={{
          display: 'grid',
          placeItems: 'center',
          width: '100%',
          height: '100%',
          cursor: 'pointer',
        }}
      >
        <PokemonAvatar id={id} size={size} />
      </button>
      {open && (
        <AvatarPicker
          current={id}
          onClose={() => setOpen(false)}
          onPick={(newId) => {
            set(newId);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
