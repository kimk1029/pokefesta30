'use client';

import { useState } from 'react';
import { useInventory } from '@/components/InventoryProvider';
import { PixelBackground } from '@/components/PixelBackground';
import { PokemonAvatar } from '@/components/PokemonAvatar';
import { useToast } from '@/components/ToastProvider';
import { AppBar } from '@/components/ui/AppBar';
import { LivePill } from '@/components/ui/LivePill';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { Segmented } from '@/components/ui/Segmented';
import { StatusBar } from '@/components/ui/StatusBar';
import { AVATARS, type AvatarId } from '@/lib/avatars';
import { BACKGROUNDS, FRAMES, type BackgroundId, type FrameId } from '@/lib/shop';

type Tab = 'avatar' | 'bg' | 'frame' | 'charge';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'avatar', label: '포켓몬' },
  { id: 'bg',     label: '배경' },
  { id: 'frame',  label: '테두리' },
  { id: 'charge', label: '포인트' },
];

const CHARGE_PACKS: Array<{ id: string; label: string; price: string; bonus: string; points: number }> = [
  { id: 'p-500',  label: '500P',    price: '₩1,000',  bonus: '',              points: 500  },
  { id: 'p-1200', label: '1,200P',  price: '₩2,000',  bonus: '+200P 보너스',  points: 1200 },
  { id: 'p-3500', label: '3,500P',  price: '₩5,000',  bonus: '+500P 보너스',  points: 3500 },
  { id: 'p-8000', label: '8,000P',  price: '₩10,000', bonus: '+2,000P 보너스', points: 8000 },
];

export function ShopScreen() {
  const inv = useInventory();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('avatar');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const buyAvatar = async (id: AvatarId, price: number) => {
    if (pendingId) return;
    setPendingId(id);
    if (inv.avatarOwned.includes(id)) {
      const r = await inv.pickAvatar(id);
      r.ok ? toast.success(`${id} 선택`) : toast.error(r.msg ?? '실패');
    } else {
      const r = await inv.buyAvatar(id, price);
      r.ok ? toast.success('획득!') : toast.error(r.msg ?? '실패');
    }
    setPendingId(null);
  };
  const buyBg = async (id: BackgroundId, price: number) => {
    if (pendingId) return;
    setPendingId(id);
    const r = await inv.buyBg(id, price);
    r.ok ? toast.success('적용!') : toast.error(r.msg ?? '실패');
    setPendingId(null);
  };
  const buyFrame = async (id: FrameId, price: number) => {
    if (pendingId) return;
    setPendingId(id);
    const r = await inv.buyFrame(id, price);
    r.ok ? toast.success('적용!') : toast.error(r.msg ?? '실패');
    setPendingId(null);
  };
  const charge = async (label: string, points: number) => {
    if (pendingId) return;
    setPendingId(label);
    const r = await inv.charge(points);
    r.ok ? toast.success(`${label} 충전 완료 · +${points.toLocaleString()}P`) : toast.error(r.msg ?? '실패');
    setPendingId(null);
  };

  return (
    <>
      <StatusBar />
      <AppBar
        title="꾸미기 샵"
        showBack
        right={<LivePill label={`${inv.points.toLocaleString()}P`} />}
      />

      <div style={{ height: 14 }} />
      <Segmented items={TABS} value={tab} onChange={setTab} />

      {tab === 'avatar' && (
        <div className="sect">
          <SectionTitle title="포켓몬 아바타" right={<span className="more">총 {AVATARS.length}종</span>} />
          <div className="shop-avatar-grid">
            {AVATARS.map((a) => {
              const owned = inv.avatarOwned.includes(a.id);
              const current = inv.avatar === a.id;
              const levelLocked = a.mode === 'level' && !owned;
              return (
                <div key={a.id} className={`shop-avatar-card${current ? ' on' : ''}`}>
                  <div className="sac-img"><PokemonAvatar id={a.id} size={60} /></div>
                  <div className="sac-name">{a.name}</div>
                  {a.tag && <div className={`sac-tag tag-${a.tag}`}>{a.tag.toUpperCase()}</div>}
                  <button
                    type="button"
                    className={`sac-btn ${owned ? 'owned' : ''} ${levelLocked ? 'locked' : ''}`}
                    disabled={levelLocked || pendingId === a.id}
                    onClick={() => buyAvatar(a.id, a.price ?? 0)}
                  >
                    {pendingId === a.id
                      ? '...'
                      : owned
                        ? current ? '선택됨' : '선택'
                        : levelLocked
                          ? `🔒 LV.${a.level}`
                          : a.mode === 'shop'
                            ? `🪙 ${(a.price ?? 0).toLocaleString()}`
                            : '획득'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'bg' && (
        <div className="sect">
          <SectionTitle title="배경" right={<span className="more">총 {BACKGROUNDS.length}종</span>} />
          <div className="shop-avatar-grid">
            {BACKGROUNDS.map((b) => {
              const owned = inv.bgOwned.includes(b.id);
              const current = inv.bg === b.id;
              return (
                <div key={b.id} className={`shop-avatar-card${current ? ' on' : ''}`}>
                  <div className="sac-img" style={{ position: 'relative', width: 72, height: 48, overflow: 'hidden' }}>
                    <PixelBackground id={b.id} />
                  </div>
                  <div className="sac-name">{b.name}</div>
                  {b.tag && <div className={`sac-tag tag-${b.tag}`}>{b.tag.toUpperCase()}</div>}
                  <button
                    type="button"
                    className={`sac-btn ${owned ? 'owned' : ''}`}
                    disabled={pendingId === b.id}
                    onClick={() => buyBg(b.id, b.price)}
                  >
                    {pendingId === b.id ? '...' : owned ? (current ? '선택됨' : '선택') : `🪙 ${b.price.toLocaleString()}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'frame' && (
        <div className="sect">
          <SectionTitle title="테두리" right={<span className="more">총 {FRAMES.length}종</span>} />
          <div className="shop-avatar-grid">
            {FRAMES.map((f) => {
              const owned = inv.frameOwned.includes(f.id);
              const current = inv.frame === f.id;
              return (
                <div key={f.id} className={`shop-avatar-card${current ? ' on' : ''}`}>
                  <div className={`sac-img frm-${f.id}`} style={{ width: 64, height: 64, background: 'var(--pap2)' }}>
                    <PokemonAvatar id="bulbasaur" size={44} />
                  </div>
                  <div className="sac-name">{f.name}</div>
                  {f.tag && <div className={`sac-tag tag-${f.tag}`}>{f.tag.toUpperCase()}</div>}
                  <button
                    type="button"
                    className={`sac-btn ${owned ? 'owned' : ''}`}
                    disabled={pendingId === f.id}
                    onClick={() => buyFrame(f.id, f.price)}
                  >
                    {pendingId === f.id ? '...' : owned ? (current ? '선택됨' : '선택') : `🪙 ${f.price.toLocaleString()}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'charge' && (
        <div className="sect">
          <SectionTitle title="포인트 충전" right={<LivePill />} />
          {CHARGE_PACKS.map((p) => (
            <div key={p.id} className="shop-card">
              <div className="sh-icon" style={{ background: '#3A5BD9', color: '#fff' }}>🪙</div>
              <div className="sh-main">
                <div className="sh-title">{p.label}</div>
                {p.bonus && <div className="sh-desc" style={{ color: 'var(--grn-dk)' }}>✨ {p.bonus}</div>}
              </div>
              <div className="sh-right">
                <span className="sh-price">{p.price}</span>
                <button type="button" className="sh-buy" disabled={pendingId === p.label} onClick={() => charge(p.label, p.points)}>
                  {pendingId === p.label ? '...' : '결제'}
                </button>
              </div>
            </div>
          ))}
          <div
            style={{
              margin: '4px 0 0',
              padding: '10px 12px',
              background: 'var(--pap2)',
              fontFamily: 'var(--f1)',
              fontSize: 9,
              color: 'var(--ink2)',
              lineHeight: 1.8,
              letterSpacing: 0.3,
              textAlign: 'center',
              boxShadow:
                '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
            }}
          >
            🚧 실제 결제는 아직 붙지 않았어요. 버튼 누르면 테스트 포인트 지급.
          </div>
        </div>
      )}

      <div className="bggap" />
    </>
  );
}
