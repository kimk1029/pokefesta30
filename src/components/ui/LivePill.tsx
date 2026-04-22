export function LivePill({ label = 'LIVE' }: { label?: string }) {
  return <span className="live-pill">{label}</span>;
}
