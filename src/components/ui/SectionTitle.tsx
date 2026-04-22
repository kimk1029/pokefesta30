import type { ReactNode } from 'react';

interface Props {
  title: string;
  right?: ReactNode;
}

export function SectionTitle({ title, right }: Props) {
  return (
    <div className="sect-title">
      <h2>{title}</h2>
      {right}
    </div>
  );
}
