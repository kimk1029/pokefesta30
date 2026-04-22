import Link from 'next/link';
import type { ReactNode } from 'react';

interface Props {
  href: string;
  color: 'r' | 'b' | 'y' | 'g';
  icon: ReactNode;
  label: string;
}

export function QuickItem({ href, color, icon, label }: Props) {
  return (
    <Link href={href} className="qi">
      <div className={`qi-icon ${color}`}>{icon}</div>
      <span>{label}</span>
    </Link>
  );
}
