import { QuickItem } from './ui/QuickItem';

export function QuickGrid() {
  return (
    <div className="quick-grid">
      <QuickItem href="/my/cards" color="r" icon="🃏" label="내 카드" />
      <QuickItem href="/cards/grading" color="y" icon="🔍" label="그레이딩" />
      <QuickItem href="/cards" color="g" icon="📊" label="시세" />
      <QuickItem href="/trade" color="b" icon="🤝" label="거래" />
      <QuickItem href="/feed" color="r" icon="🗣" label="커뮤니티" />
    </div>
  );
}
