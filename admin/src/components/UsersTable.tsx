'use client';

import { useState } from 'react';
import { UserDetailModal } from './UserDetailModal';

interface Row {
  id: string;
  name: string;
  avatarId: string;
  points: number;
  createdAt: string;
  updatedAt: string;
  counts: {
    feeds: number; trades: number; bookmarks: number;
    sentMessages: number; receivedMessages: number; oripaTickets: number;
  };
}

function fmt(d: string | null | undefined): string {
  if (!d) return '-';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

export function UsersTable({ rows }: { rows: Row[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (rows.length === 0) return <div className="empty">검색 결과가 없습니다.</div>;

  return (
    <>
      <table className="tbl">
        <thead>
          <tr>
            <th>이름</th>
            <th>아바타</th>
            <th style={{ textAlign: 'right' }}>포인트</th>
            <th style={{ textAlign: 'right' }}>피드</th>
            <th style={{ textAlign: 'right' }}>거래</th>
            <th style={{ textAlign: 'right' }}>찜</th>
            <th style={{ textAlign: 'right' }}>쪽지</th>
            <th style={{ textAlign: 'right' }}>오리파</th>
            <th>가입</th>
            <th>마지막 활동</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td className="mono">{u.avatarId}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{u.points.toLocaleString()}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{u.counts.feeds}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{u.counts.trades}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{u.counts.bookmarks}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{u.counts.sentMessages + u.counts.receivedMessages}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{u.counts.oripaTickets}</td>
              <td className="mono muted">{fmt(u.createdAt)}</td>
              <td className="mono muted">{fmt(u.updatedAt)}</td>
              <td>
                <button type="button" className="btn" onClick={() => setOpenId(u.id)}>상세</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {openId && <UserDetailModal userId={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
