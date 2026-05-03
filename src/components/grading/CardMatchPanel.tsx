'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CardPriceChart } from '@/components/CardPriceChart';
import type { CardOcrResult } from './cardOcr';
import type { HistoryPoint, PriceCurrent } from '@/lib/cardPrices';
import { matchCardFromOcr, type CardMatch } from '@/lib/grading/matchCard';

interface Props {
  ocr: CardOcrResult | null;
  /** 그레이딩 결과 라벨 (예: "PSA 9 (Mint)") — 없으면 미저장. */
  gradeLabel?: string | null;
  /** 0..100 중심도 점수. 저장 시 함께 기록. */
  centeringScore?: number | null;
}

/**
 * OCR 결과 → 카탈로그 매칭 → 시세 카드 + 미니 차트 패널 + "내 카드에 저장".
 * OCR 가 없으면 null 렌더 (조용히).
 */
export function CardMatchPanel({ ocr, gradeLabel, centeringScore }: Props) {
  const match = useMemo(() => (ocr ? matchCardFromOcr(ocr) : null), [ocr]);

  if (!ocr) return null;

  return (
    <>
      {match ? (
        <MatchedCardPanel match={match} />
      ) : (
        <div className="form-sect">
          <div
            style={{
              padding: '10px 12px',
              background: 'var(--pap2)',
              fontFamily: 'var(--f1)',
              fontSize: 9,
              color: 'var(--ink3)',
              letterSpacing: 0.3,
              lineHeight: 1.6,
              textAlign: 'center',
            }}
          >
            📊 카탈로그에서 일치하는 카드를 찾지 못했어요
            <br />
            <span style={{ fontSize: 8, opacity: 0.7 }}>
              (이름/세트코드/번호가 OCR 로 잘 읽혔는지 확인해주세요)
            </span>
          </div>
        </div>
      )}

      <SaveToArchive
        ocr={ocr}
        match={match}
        gradeLabel={gradeLabel ?? null}
        centeringScore={centeringScore ?? null}
      />
    </>
  );
}

/* ---------------------------------------------------------------- */

function SaveToArchive({
  ocr,
  match,
  gradeLabel,
  centeringScore,
}: {
  ocr: CardOcrResult;
  match: CardMatch | null;
  gradeLabel: string | null;
  centeringScore: number | null;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSave = async () => {
    if (saving || saved) return;
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch('/api/me/cards', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          cardId: match?.entry.id ?? null,
          ocrSetCode: ocr.setCode ?? ocr.promoCode ?? null,
          ocrCardNumber: ocr.cardNumber?.left ?? null,
          gradeEstimate: gradeLabel,
          centeringScore,
        }),
      });
      if (r.status === 401) {
        setErr('로그인이 필요해요');
        return;
      }
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${r.status}`);
      }
      setSaved(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="form-sect">
      <button
        type="button"
        onClick={onSave}
        disabled={saving || saved}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: saved ? 'var(--ink3)' : 'var(--ink)',
          color: 'var(--white)',
          fontFamily: 'var(--f1)',
          fontSize: 11,
          letterSpacing: 0.5,
          border: 'none',
          cursor: saving || saved ? 'default' : 'pointer',
          boxShadow:
            '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
        }}
      >
        {saved
          ? '✓ 내 카드에 저장됨'
          : saving
            ? '저장 중...'
            : '＋ 내 카드에 저장'}
      </button>
      {err && (
        <div
          style={{
            marginTop: 8,
            fontFamily: 'var(--f1)',
            fontSize: 9,
            color: 'var(--red)',
            textAlign: 'center',
            letterSpacing: 0.3,
          }}
        >
          ⚠ {err}
        </div>
      )}
      {saved && (
        <div
          style={{
            marginTop: 8,
            fontFamily: 'var(--f1)',
            fontSize: 9,
            color: 'var(--ink3)',
            textAlign: 'center',
            letterSpacing: 0.3,
          }}
        >
          <Link href="/my/cards" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
            내 카드 보기 →
          </Link>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */

function MatchedCardPanel({ match }: { match: CardMatch }) {
  const { entry, confidence, reasons } = match;
  const [price, setPrice] = useState<PriceCurrent | null>(null);
  const [history, setHistory] = useState<HistoryPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setPrice(null);
    setHistory(null);

    Promise.all([
      fetch(`/api/cards/${entry.id}/price`, { cache: 'no-store' }).then(safeJson),
      fetch(`/api/cards/${entry.id}/history?days=30`, { cache: 'no-store' }).then(safeJson),
    ])
      .then(([priceRes, histRes]) => {
        if (cancelled) return;
        const p = priceRes as { data?: PriceCurrent | null } | null;
        const h = histRes as { data?: HistoryPoint[] | null } | null;
        setPrice(p?.data ?? null);
        setHistory(h?.data ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : '시세 조회 실패');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entry.id]);

  return (
    <div className="form-sect">
      <div className="form-label">📊 시세 매칭</div>

      <div
        style={{
          padding: 12,
          background: 'var(--pap2)',
          boxShadow:
            '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* 매칭 카드 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 44,
              height: 44,
              display: 'grid',
              placeItems: 'center',
              fontSize: 28,
              background: 'var(--white)',
              boxShadow:
                '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink)',
            }}
          >
            {entry.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--f2)',
                fontSize: 14,
                color: 'var(--ink)',
                lineHeight: 1.3,
              }}
            >
              {entry.name}
            </div>
            <div
              style={{
                fontFamily: 'var(--f1)',
                fontSize: 8,
                color: 'var(--ink3)',
                letterSpacing: 0.3,
                marginTop: 3,
              }}
            >
              매칭 신뢰도 {confidence}점 · {reasons.join(' / ')}
            </div>
          </div>
          <span
            className="tag"
            style={{
              fontSize: 9,
              padding: '2px 6px',
              background: gradeColor(entry.grade),
              color: 'var(--white)',
            }}
          >
            {entry.grade}
          </span>
        </div>

        {/* 시세 본체 */}
        {loading ? (
          <div
            style={{
              padding: 16,
              textAlign: 'center',
              fontFamily: 'var(--f1)',
              fontSize: 9,
              color: 'var(--ink3)',
              letterSpacing: 0.5,
            }}
          >
            시세 불러오는 중…
          </div>
        ) : err ? (
          <div
            style={{
              padding: 10,
              fontFamily: 'var(--f1)',
              fontSize: 9,
              color: 'var(--red)',
              textAlign: 'center',
            }}
          >
            ⚠ {err}
          </div>
        ) : !price ? (
          <div
            style={{
              padding: 10,
              fontFamily: 'var(--f1)',
              fontSize: 9,
              color: 'var(--ink3)',
              textAlign: 'center',
              letterSpacing: 0.3,
            }}
          >
            아직 시세 데이터가 없어요
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 6,
              }}
            >
              <PriceStat label="평균" value={fmtUsd(price.avg)} />
              <PriceStat label="최저" value={fmtUsd(price.low)} />
              <PriceStat label="최고" value={fmtUsd(price.high)} />
            </div>
            <div
              style={{
                fontFamily: 'var(--f1)',
                fontSize: 8,
                color: 'var(--ink3)',
                letterSpacing: 0.3,
                textAlign: 'right',
              }}
            >
              샘플 {price.sampleN}건 · {fmtTime(price.fetchedAt)} 기준
            </div>
            <div
              style={{
                background: 'var(--white)',
                padding: 6,
                boxShadow:
                  '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink)',
              }}
            >
              <CardPriceChart history={history ?? []} width={280} height={56} />
            </div>
          </>
        )}

        <Link
          href={`/cards/search?id=${encodeURIComponent(entry.id)}`}
          className="appbar-right"
          style={{
            textAlign: 'center',
            background: 'var(--ink)',
            color: 'var(--white)',
            padding: '8px 12px',
            fontFamily: 'var(--f1)',
            fontSize: 10,
            letterSpacing: 0.5,
            textDecoration: 'none',
          }}
        >
          ▶ 상세 시세 페이지로
        </Link>
      </div>
    </div>
  );
}

function PriceStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'var(--white)',
        padding: '6px 4px',
        textAlign: 'center',
        boxShadow:
          '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink)',
      }}
    >
      <div style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)', letterSpacing: 0.3 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--f2)', fontSize: 13, color: 'var(--ink)', marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function safeJson(r: Response): Promise<unknown> {
  if (!r.ok) return Promise.reject(new Error(`HTTP ${r.status}`));
  return r.json();
}

function fmtUsd(v: number): string {
  if (!Number.isFinite(v)) return '—';
  return `$${v.toFixed(v < 10 ? 2 : 0)}`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const mins = Math.max(0, Math.floor((now - d.getTime()) / 60_000));
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

function gradeColor(g: string): string {
  switch (g) {
    case 'S':
      return '#FF3B6B';
    case 'A':
      return '#FFD23F';
    case 'B':
      return '#3A5BD9';
    default:
      return '#6B7280';
  }
}
