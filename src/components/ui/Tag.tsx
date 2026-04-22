import type { ReactNode } from 'react';

export type TagVariant = 'buy' | 'sell' | 'report' | 'feed' | 'place';

const CLS: Record<TagVariant, string> = {
  buy: 'tag-buy',
  sell: 'tag-sell',
  report: 'tag-report',
  feed: 'tag-feed',
  place: 'tag-place',
};

export function Tag({ variant, children }: { variant: TagVariant; children: ReactNode }) {
  return <span className={`tag ${CLS[variant]}`}>{children}</span>;
}
