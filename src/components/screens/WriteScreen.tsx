'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { submitReport } from '@/app/actions';
import { AppBar } from '@/components/ui/AppBar';
import { Chip } from '@/components/ui/Chip';
import { CongOption } from '@/components/ui/CongOption';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StatusBar } from '@/components/ui/StatusBar';
import { TextInput } from '@/components/ui/TextInput';
import { TradeTypeButton } from '@/components/ui/TradeTypeButton';
import type { CongestionLevel, Place, TradeType } from '@/lib/types';

export type WriteMode = 'report' | 'trade' | 'feed';

const TITLES: Record<WriteMode, string> = {
  report: '제보하기',
  trade: '거래글 작성',
  feed: '피드 작성',
};

const LEVELS: Array<{ id: CongestionLevel; emoji: string; label: string }> = [
  { id: 'empty', emoji: '🟢', label: '여유' },
  { id: 'normal', emoji: '🟡', label: '보통' },
  { id: 'busy', emoji: '🟠', label: '혼잡' },
  { id: 'full', emoji: '🔴', label: '매우혼잡' },
];

interface Props {
  mode: WriteMode;
  places: Place[];
}

export function WriteScreen({ mode, places }: Props) {
  const router = useRouter();
  const [place, setPlace] = useState<string>(places[0]?.id ?? '');
  const [level, setLevel] = useState<CongestionLevel>('normal');
  const [ttype, setTtype] = useState<TradeType>('buy');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!place) {
      setError('장소를 선택해주세요');
      return;
    }
    setError(null);

    if (mode === 'report') {
      const fd = new FormData();
      fd.set('place_id', place);
      fd.set('level', level);
      fd.set('note', note);
      startTransition(async () => {
        try {
          await submitReport(fd);
        } catch (e) {
          setError(e instanceof Error ? e.message : '제보 실패');
        }
      });
      return;
    }

    // trade/feed: 현재는 mock (클라이언트 라우팅만). 추후 actions에 엔드포인트 추가.
    router.push(mode === 'trade' ? '/trade' : '/feed');
  };

  const submitLabel =
    mode === 'report' ? '제보 등록' : mode === 'trade' ? '거래글 등록' : '피드 올리기';

  return (
    <>
      <StatusBar />
      <AppBar title={TITLES[mode]} showBack />
      <div style={{ height: 14 }} />

      {mode === 'trade' && (
        <div className="form-sect">
          <div className="form-label">
            📦 유형 <span className="req">*</span>
          </div>
          <div className="trade-type-grid">
            <TradeTypeButton variant="buy" active={ttype === 'buy'} onClick={() => setTtype('buy')}>
              💙 삽니다
            </TradeTypeButton>
            <TradeTypeButton
              variant="sell"
              active={ttype === 'sell'}
              onClick={() => setTtype('sell')}
            >
              ❤️ 팝니다
            </TradeTypeButton>
          </div>
        </div>
      )}

      <div className="form-sect">
        <div className="form-label">
          📍 장소 <span className="req">*</span>
        </div>
        <div className="chip-grid">
          {places.map((p) => (
            <Chip key={p.id} active={place === p.id} onClick={() => setPlace(p.id)}>
              {p.emoji} {p.name}
            </Chip>
          ))}
        </div>
      </div>

      {mode === 'report' && (
        <div className="form-sect">
          <div className="form-label">
            🌡 혼잡도 <span className="req">*</span>
          </div>
          <div className="cong-grid">
            {LEVELS.map((o) => (
              <CongOption
                key={o.id}
                level={o.id}
                emoji={o.emoji}
                label={o.label}
                active={level === o.id}
                onClick={() => setLevel(o.id)}
              />
            ))}
          </div>
        </div>
      )}

      {mode === 'trade' && (
        <>
          <div className="form-sect">
            <div className="form-label">
              📝 제목 <span className="req">*</span>
            </div>
            <TextInput
              placeholder="거래 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="form-sect">
            <div className="form-label">💰 가격</div>
            <TextInput
              placeholder="예) 15,000원 / 정가 / 협의"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </>
      )}

      <div className="form-sect">
        <div className="form-label">
          {mode === 'report' ? '💬 한 줄 제보' : mode === 'trade' ? '📄 내용' : '🗣 하고 싶은 말'}
        </div>
        {mode !== 'trade' && (
          <div className="form-hint">
            {mode === 'report'
              ? '선택 · 다른 트레이너에게 도움이 되는 정보'
              : '현장 분위기, 팁, 잡담 모두 환영!'}
          </div>
        )}
        <TextInput
          placeholder={
            mode === 'report'
              ? '예) 20명 대기, 회전 빠름'
              : mode === 'trade'
                ? '거래 관련 상세 내용'
                : '자유롭게 입력하세요'
          }
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error && (
        <div
          className="form-sect"
          style={{ color: 'var(--red)', fontFamily: 'var(--f2)', fontSize: 12 }}
        >
          ⚠ {error}
        </div>
      )}

      <PrimaryButton onClick={submit} disabled={pending}>
        {pending ? `▶ 등록 중 ▶` : `▶ ${submitLabel} ▶`}
      </PrimaryButton>
    </>
  );
}
