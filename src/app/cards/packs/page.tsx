import Link from 'next/link';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { CARD_PACKS } from '@/lib/cardPacks';

export const metadata = {
  title: '가격탐색 · CardVault',
  description: '포켓몬 카드 박스를 선택하고 해당 박스의 싱글카드 시세를 확인하세요.',
};

export default function PackExplorerPage() {
  return (
    <>
      <StatusBar />
      <AppBar title="가격탐색" showBack backHref="/" />

      <div className="sect">
        <div
          style={{
            padding: '14px 14px 12px',
            background: 'var(--white)',
            boxShadow:
              '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.9),5px 5px 0 var(--ink)',
          }}
        >
          <div style={{ fontFamily: 'var(--f1)', fontSize: 13, letterSpacing: 0.4 }}>
            포켓몬 카드 박스
          </div>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', marginTop: 7, lineHeight: 1.6 }}>
            박스를 선택하면 해당 박스에 포함된 싱글카드 시세가 표시됩니다.
          </div>
        </div>
      </div>

      <div className="sect">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CARD_PACKS.map((pack) => (
            <Link
              key={pack.code}
              href={`/cards/packs/${pack.code}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                background: 'var(--white)',
                color: 'inherit',
                textDecoration: 'none',
                boxShadow:
                  '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.85),5px 5px 0 var(--ink)',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  background: pack.bg,
                  color: 'var(--white)',
                  fontSize: 20,
                  boxShadow:
                    '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.35),3px 3px 0 var(--ink)',
                }}
              >
                {pack.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--f1)',
                    fontSize: 11,
                    letterSpacing: 0.2,
                    whiteSpace: 'normal',
                    lineHeight: 1.45,
                  }}
                >
                  {pack.name}
                </div>
                <div style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)', marginTop: 5, letterSpacing: 0.3 }}>
                  {pack.releasedAt ? `${pack.releasedAt} 출시` : '출시일 확인 중'}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--f1)', fontSize: 14, color: 'var(--ink3)' }}>›</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="bggap" />
    </>
  );
}
