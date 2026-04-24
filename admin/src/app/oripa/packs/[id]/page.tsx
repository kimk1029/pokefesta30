import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OripaPackForm, type OripaPackFormValue } from '@/components/OripaPackForm';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: { id: string } }) {
  const pack = await prisma.oripaPack.findUnique({ where: { id: params.id } });
  if (!pack) notFound();

  const initial: Partial<OripaPackFormValue> = {
    id: pack.id,
    tier: pack.tier,
    emoji: pack.emoji,
    name: pack.name,
    desc: pack.desc,
    price: pack.price,
    ticketsCount: pack.ticketsCount,
    prizes: Array.isArray(pack.prizes) ? (pack.prizes as unknown[]) : [],
    active: pack.active,
  };

  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <Link href="/oripa/packs" className="btn">← 목록</Link>
      </div>
      <h1 className="admin-h1">{pack.name}</h1>
      <p className="admin-sub mono">{pack.id}</p>
      <OripaPackForm mode="edit" initial={initial} />
    </>
  );
}
