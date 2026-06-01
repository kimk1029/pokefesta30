'use client';

import { useState } from 'react';
import { CardRegisterSheet, type RegisterCardInput } from '@/components/cards/CardRegisterSheet';

interface CatalogOption {
  id: string;
  name: string;
  emoji: string;
  grade: 'S' | 'A' | 'B' | 'C';
}

interface Props {
  catalog: CatalogOption[];
}

/** /api/cards/lookup 응답의 card 부분 (필요한 필드만). */
interface LookupCard {
  id?: string;
  name?: string;
  localName?: string | null;
  setName?: string;
  setCode?: string;
  number?: string;
  rarity?: string;
  imageSmall?: string | null;
  imageLarge?: string | null;
  priceSummary?: {
    byRegion?: { jpy?: number | null; krw?: number | null } | null;
  } | null;
}

/**
 * 직접입력 플로우: 세트코드 + 카드번호로 검색 → 결과 카드 리스트 → 선택 →
 * 스캔과 동일한 "카드 등록" 시트로 진입.
 */
export function ManualAddForm(_props: Props) {
  const [setCode, setSetCode] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [name, setName] = useState('');

  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<RegisterCardInput[]>([]);
  const [selected, setSelected] = useState<RegisterCardInput | null>(null);

  const runSearch = async () => {
    if (searching) return;
    setErr(null);
    if (!setCode.trim() || !cardNumber.trim()) {
      setErr('세트 코드와 카드 번호를 입력해 주세요');
      return;
    }
    setSearching(true);
    setSearched(false);
    setResults([]);
    setSelected(null);
    try {
      const qs = new URLSearchParams({ setCode: setCode.trim(), number: cardNumber.trim() });
      if (name.trim()) qs.set('name', name.trim());
      const r = await fetch(`/api/cards/lookup?${qs.toString()}`, { cache: 'no-store' });
      const data = (await r.json().catch(() => null)) as
        | { ok?: boolean; found?: boolean; card?: LookupCard | null }
        | null;
      const list: RegisterCardInput[] = [];
      if (data?.found && data.card) {
        list.push(lookupToRegister(data.card));
      }
      // 카탈로그 내 세트코드 부분일치도 같이 노출 (보조)
      setResults(list);
      setSearched(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '검색 실패');
    } finally {
      setSearching(false);
    }
  };

  // 검색이 비어도 입력값 그대로 등록할 수 있도록 fallback 카드 구성
  const fallbackCard: RegisterCardInput = {
    setCode: setCode.trim() || null,
    cardNumber: cardNumber.trim() || null,
    name: name.trim() || null,
    imageUrl: null,
  };

  if (selected) {
    return (
      <div className="cv-manual-form">
        <button type="button" className="cv-reg-back" onClick={() => setSelected(null)}>
          ← 다른 카드 선택
        </button>
        <CardRegisterSheet card={selected} />
      </div>
    );
  }

  return (
    <div className="cv-manual-form">
      <div className="cv-manual-row">
        <Field label="세트 코드">
          <input
            className="cv-manual-input"
            maxLength={16}
            value={setCode}
            onChange={(e) => setSetCode(e.target.value.toUpperCase())}
            placeholder="예) SV1"
          />
        </Field>
        <Field label="카드 번호">
          <input
            className="cv-manual-input"
            maxLength={16}
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="예) 045"
          />
        </Field>
      </div>
      <Field label="카드 이름 (선택)" hint="검색 정확도를 높여줘요.">
        <input
          className="cv-manual-input"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예) 리자몽 ex"
        />
      </Field>

      {err && <div className="cv-manual-err">⚠ {err}</div>}

      <button type="button" className="cv-manual-submit" disabled={searching} onClick={runSearch}>
        {searching ? '검색 중...' : '🔍 카드 검색'}
      </button>

      {searched && (
        <div className="cv-reg-results">
          <div className="cv-manual-label" style={{ marginBottom: 8 }}>
            검색 결과 {results.length}건
          </div>
          {results.map((c, i) => (
            <button key={i} type="button" className="cv-reg-result" onClick={() => setSelected(c)}>
              <div className="cv-reg-thumb">
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt={c.name ?? '카드'} />
                ) : (
                  <span style={{ fontSize: 24 }}>🃏</span>
                )}
              </div>
              <div className="cv-reg-meta">
                <div className="cv-reg-name">{c.name ?? '이름 미상'}</div>
                <div className="cv-reg-sub">
                  {[c.setCode?.toUpperCase(), c.cardNumber].filter(Boolean).join(' · ')}
                </div>
                {c.currentPriceJpy != null && (
                  <div className="cv-reg-price">현재시세 ¥{Math.round(c.currentPriceJpy).toLocaleString()}</div>
                )}
              </div>
              <span className="cv-reg-pick">선택 ▶</span>
            </button>
          ))}

          {/* 검색에 안 잡혀도 입력값 그대로 등록 */}
          <button type="button" className="cv-reg-result cv-reg-result-manual" onClick={() => setSelected(fallbackCard)}>
            <div className="cv-reg-thumb">
              <span style={{ fontSize: 24 }}>✍️</span>
            </div>
            <div className="cv-reg-meta">
              <div className="cv-reg-name">입력한 정보 그대로 등록</div>
              <div className="cv-reg-sub">
                {[setCode.toUpperCase(), cardNumber].filter(Boolean).join(' · ') || '세트/번호'}
              </div>
            </div>
            <span className="cv-reg-pick">선택 ▶</span>
          </button>
        </div>
      )}
    </div>
  );
}

function lookupToRegister(card: LookupCard): RegisterCardInput {
  return {
    cardId: null,
    setCode: card.setCode ?? null,
    cardNumber: card.number ?? null,
    name: card.localName || card.name || null,
    imageUrl: card.imageLarge || card.imageSmall || null,
    currentPriceJpy: card.priceSummary?.byRegion?.jpy ?? null,
    currentPriceKrw: card.priceSummary?.byRegion?.krw ?? null,
  };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="cv-manual-field">
      <div className="cv-manual-label">{label}</div>
      {hint && <div className="cv-manual-hint">{hint}</div>}
      {children}
    </div>
  );
}
