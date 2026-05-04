'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

interface CatalogOption {
  id: string;
  name: string;
  emoji: string;
  grade: 'S' | 'A' | 'B' | 'C';
}

interface Props {
  catalog: CatalogOption[];
}

const PSA_OPTIONS = ['미입력', 'PSA 10 (Gem Mint)', 'PSA 9 (Mint)', 'PSA 8 (NM-MT)', 'PSA 7 (NM)', 'PSA 6 (EX-MT)'];

export function ManualAddForm({ catalog }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [cardId, setCardId] = useState<string>('');
  const [nickname, setNickname] = useState('');
  const [setCode, setSetCode] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [grade, setGrade] = useState<string>('미입력');
  const [memo, setMemo] = useState('');

  const submit = () => {
    setErr(null);

    const payload: Record<string, unknown> = {};
    if (cardId) payload.cardId = cardId;
    if (nickname.trim()) payload.nickname = nickname.trim();
    if (setCode.trim()) payload.ocrSetCode = setCode.trim();
    if (cardNumber.trim()) payload.ocrCardNumber = cardNumber.trim();
    if (grade !== '미입력') payload.gradeEstimate = grade;
    if (memo.trim()) payload.memo = memo.trim();

    if (!payload.cardId && !payload.ocrSetCode && !payload.ocrCardNumber && !payload.nickname) {
      setErr('카탈로그 선택, 세트/번호, 또는 별칭 중 하나는 입력해 주세요');
      return;
    }
    // API 가 cardId/OCR 둘 다 비면 거절하므로, 별칭만 있을 땐 별칭을 OCR 자리에 한 번 더
    if (!payload.cardId && !payload.ocrSetCode && !payload.ocrCardNumber && payload.nickname) {
      payload.ocrCardNumber = String(payload.nickname).slice(0, 16);
    }

    start(async () => {
      try {
        const r = await fetch('/api/me/cards', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const data = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `HTTP ${r.status}`);
        }
        router.push('/my/cards');
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : '저장 실패');
      }
    });
  };

  return (
    <div className="cv-manual-form">
      <Field label="카드 선택 (선택)" hint="카탈로그에 있다면 골라주세요. 없으면 비워두고 별칭만 입력해도 돼요.">
        <div className="cv-manual-catalog">
          <button
            type="button"
            className={`cv-manual-cat-btn${cardId === '' ? ' on' : ''}`}
            onClick={() => setCardId('')}
          >
            없음
          </button>
          {catalog.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`cv-manual-cat-btn${cardId === c.id ? ' on' : ''}`}
              onClick={() => setCardId(c.id)}
              title={c.name}
            >
              <span style={{ marginRight: 4 }}>{c.emoji}</span>
              {c.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="별칭 (선택)" hint="‘리자몽 #1’ 처럼 내 컬렉션 안에서 부를 이름.">
        <input
          className="cv-manual-input"
          maxLength={60}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="예) 리자몽 베이스셋 1번"
        />
      </Field>

      <div className="cv-manual-row">
        <Field label="세트 코드 (선택)">
          <input
            className="cv-manual-input"
            maxLength={16}
            value={setCode}
            onChange={(e) => setSetCode(e.target.value.toUpperCase())}
            placeholder="예) SV1"
          />
        </Field>
        <Field label="카드 번호 (선택)">
          <input
            className="cv-manual-input"
            maxLength={16}
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="예) 045/198"
          />
        </Field>
      </div>

      <Field label="그레이딩 (선택)">
        <div className="cv-manual-grades">
          {PSA_OPTIONS.map((g) => (
            <button
              key={g}
              type="button"
              className={`cv-manual-grade${grade === g ? ' on' : ''}`}
              onClick={() => setGrade(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </Field>

      <Field label="메모 (선택)" hint="구입 경로, 보관 위치, 컨디션 등 자유 메모.">
        <textarea
          className="cv-manual-input cv-manual-textarea"
          maxLength={500}
          rows={4}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="예) 2025년 6월 도쿄 출장에서 카드샵 X 에서 구입"
        />
      </Field>

      {err && <div className="cv-manual-err">⚠ {err}</div>}

      <button
        type="button"
        className="cv-manual-submit"
        disabled={pending}
        onClick={submit}
      >
        {pending ? '저장 중...' : '＋ 컬렉션에 추가'}
      </button>
    </div>
  );
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
