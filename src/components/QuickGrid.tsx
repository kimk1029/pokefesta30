import { QuickItem } from './ui/QuickItem';

export function QuickGrid() {
  return (
    <div className="quick-grid">
      <QuickItem href="/cards/grading" color="g" icon="📷" label="스캔" />
      <QuickItem href="/cards" color="y" icon="¥" label="시세확인" />
      <QuickItem href="/cards/mvc-auction" color="b" icon="🔨" label="MVC경매" />
      <QuickItem href="/cards/bunjang" color="r" icon="🇰🇷" label="국내마켓" />
      <QuickItem href="/trade" color="g" icon="🤝" label="거래" />
    </div>
  );
}
