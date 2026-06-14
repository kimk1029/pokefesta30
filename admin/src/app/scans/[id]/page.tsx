import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const ENGINE_LABEL: Record<string, string> = {
  vision: 'OpenAI Vision',
  paddle: 'PaddleOCR',
  none: '실패',
};

export default async function Page({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const row = await prisma.scanLog.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!row) notFound();

  const ex = (row.extracted ?? null) as null | Record<string, unknown>;
  const cands = (row.candidates ?? []) as Array<Record<string, unknown>>;
  const req = (row.request ?? null) as null | Record<string, unknown>;

  return (
    <>
      <p className="admin-sub" style={{ marginBottom: 6 }}>
        <Link href="/scans">← 스캔 로그</Link>
      </p>
      <h1 className="admin-h1">스캔 #{row.id}</h1>
      <p className="admin-sub">{fmtDate(row.createdAt)} · {row.source === 'app' ? '앱' : '웹'}</p>

      <Section title="요약">
        <dl className="kv">
          <Row k="엔진" v={ENGINE_LABEL[row.engine] ?? row.engine} />
          <Row k="모델" v={row.model ?? '—'} />
          <Row k="언어 힌트" v={row.langHint || '—'} />
          <Row k="성공 여부" v={row.success ? '✅ 후보 있음' : '❌ 후보 없음'} />
          <Row k="후보 수" v={String(row.candidateCount)} />
          <Row k="신뢰도" v={row.confidence != null ? row.confidence.toFixed(3) : '—'} />
          <Row k="소요 시간" v={`${row.durationMs.toLocaleString()} ms`} />
          <Row
            k="이미지 크기"
            v={row.imageWidth && row.imageHeight ? `${row.imageWidth} × ${row.imageHeight}` : '—'}
          />
          <Row
            k="스캔한 사람"
            v={
              row.user ? (
                <Link href={`/users?q=${encodeURIComponent(row.user.id)}`}>
                  {row.user.name ?? row.user.email ?? row.user.id}
                </Link>
              ) : (
                '익명'
              )
            }
          />
          {row.snkrdunkId != null && <Row k="snkrdunk apparelId" v={String(row.snkrdunkId)} />}
          {row.errorMessage && <Row k="에러" v={<span style={{ color: '#DC2626' }}>{row.errorMessage}</span>} />}
        </dl>
      </Section>

      {(row.totalTokens != null || row.promptTokens != null) && (
        <Section title="토큰 사용량 (OpenAI)">
          <dl className="kv">
            <Row k="prompt" v={row.promptTokens?.toLocaleString() ?? '—'} />
            <Row k="completion" v={row.completionTokens?.toLocaleString() ?? '—'} />
            <Row k="total" v={row.totalTokens?.toLocaleString() ?? '—'} />
          </dl>
        </Section>
      )}

      <Section title="인식 결과 (extracted)">
        {ex ? <Json value={ex} /> : <span className="muted">없음</span>}
      </Section>

      <Section title={`매칭 후보 (${cands.length})`}>
        {cands.length === 0 ? (
          <span className="muted">없음</span>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>이름</th>
                <th>번호</th>
                <th>세트</th>
                <th>레어</th>
                <th>가격</th>
                <th>출처</th>
              </tr>
            </thead>
            <tbody>
              {cands.map((c, i) => (
                <tr key={i}>
                  <td>{String(c.name ?? '')}</td>
                  <td className="mono">{String(c.number ?? '')}</td>
                  <td className="mono">{String(c.setCode ?? '')}</td>
                  <td className="mono">{String(c.rarity ?? '')}</td>
                  <td className="mono">
                    {c.price != null ? `${Number(c.price).toLocaleString()} ${String(c.currency ?? '')}` : '—'}
                  </td>
                  <td><span className="tag">{String(c.source ?? '')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="요청 상세 (request)">
        {req ? <Json value={req} /> : <span className="muted">없음</span>}
      </Section>

      {row.prompt && (
        <Section title="시스템 프롬프트 (요청에 사용)">
          <pre className="code">{row.prompt}</pre>
        </Section>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 8 }}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt style={{ color: '#64748B', fontSize: 12 }}>{k}</dt>
      <dd style={{ margin: 0, fontSize: 13 }}>{v}</dd>
    </>
  );
}

function Json({ value }: { value: unknown }) {
  return <pre className="code">{JSON.stringify(value, null, 2)}</pre>;
}
