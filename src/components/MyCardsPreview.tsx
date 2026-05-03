import Link from 'next/link';
import { findCardEntry } from '@/lib/cardsCatalog';
import type { MyCardRow } from '@/lib/queries';
import { SectionTitle } from '@/components/ui/SectionTitle';

interface Props {
  cards: MyCardRow[];
  total: number;
}

/** 홈에 노출되는 "내 카드" 미니 컬렉션. 빈 상태면 그레이딩 안내. */
export function MyCardsPreview({ cards, total }: Props) {
  return (
    <div className="sect">
      <SectionTitle
        title={total > 0 ? `내 카드 ${total}장` : '내 카드'}
        right={
          <Link href="/my/cards" className="more">
            전체 ▶
          </Link>
        }
      />

      {cards.length === 0 ? (
        <Link
          href="/cards/grading"
          style={{
            display: 'block',
            margin: '0 var(--gap)',
            padding: '14px 12px',
            background: 'var(--pap2)',
            fontFamily: 'var(--f1)',
            fontSize: 10,
            color: 'var(--ink2)',
            letterSpacing: 0.4,
            lineHeight: 1.6,
            textAlign: 'center',
            textDecoration: 'none',
            boxShadow:
              '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
          }}
        >
          🃏 카드를 그레이딩해서 내 컬렉션에 추가해 보세요
          <br />
          <span style={{ fontSize: 9, opacity: 0.7 }}>＋ 그레이딩으로 가기</span>
        </Link>
      ) : (
        <div
          style={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridAutoColumns: '90px',
            gap: 10,
            overflowX: 'auto',
            padding: '4px var(--gap) 8px',
            scrollbarWidth: 'thin',
          }}
        >
          {cards.map((c) => (
            <PreviewTile key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function PreviewTile({ card }: { card: MyCardRow }) {
  const entry = card.cardId ? findCardEntry(card.cardId) : undefined;
  const title =
    card.nickname ||
    entry?.name ||
    (card.ocrSetCode || card.ocrCardNumber
      ? `${card.ocrSetCode ?? '?'} ${card.ocrCardNumber ?? ''}`.trim()
      : '미식별');

  return (
    <Link
      href="/my/cards"
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <div
        style={{
          aspectRatio: '3/4',
          background: 'var(--white)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 30,
          overflow: 'hidden',
          boxShadow:
            '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink)',
        }}
      >
        {card.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.photoUrl}
            alt={title}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span>{entry?.emoji ?? '🃏'}</span>
        )}
      </div>
      <div
        style={{
          marginTop: 4,
          fontFamily: 'var(--f1)',
          fontSize: 9,
          color: 'var(--ink)',
          letterSpacing: 0.3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={title}
      >
        {title}
      </div>
      {card.gradeEstimate && (
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 8,
            color: 'var(--ink3)',
            letterSpacing: 0.3,
          }}
        >
          🏆 {card.gradeEstimate.replace(/\s*\(.+\)\s*/, '')}
        </div>
      )}
    </Link>
  );
}
