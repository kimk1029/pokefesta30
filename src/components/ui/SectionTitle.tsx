import type { ReactNode } from 'react';

interface Props {
  title: string;
  /** 제목 바로 오른쪽 (같은 플렉스 그룹) — 작은 액션 아이콘 등 */
  titleRight?: ReactNode;
  /** 섹션 헤더 우측 끝 (예: "전체 ▶" 링크) */
  right?: ReactNode;
}

export function SectionTitle({ title, titleRight, right }: Props) {
  return (
    <div className="sect-title">
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {titleRight}
      </div>
      {right}
    </div>
  );
}

