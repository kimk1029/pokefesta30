import { QuickItem } from './ui/QuickItem';

export function QuickGrid() {
  return (
    <div className="quick-grid">
      <QuickItem href="/live" color="r" icon="📍" label="현황" />
      <QuickItem href="/trade" color="b" icon="💬" label="거래" />
      <QuickItem href="/report" color="y" icon="📢" label="제보" />
      <QuickItem href="/map" color="g" icon="🗺" label="지도" />
    </div>
  );
}
