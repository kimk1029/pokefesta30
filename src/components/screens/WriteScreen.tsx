'use client';

import { useState, useTransition } from 'react';
import { submitFeed, submitTrade } from '@/app/actions';
import { useAvatar } from '@/lib/use-avatar';
import { AppBar } from '@/components/ui/AppBar';
import { Chip } from '@/components/ui/Chip';
import { CongOption } from '@/components/ui/CongOption';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Segmented } from '@/components/ui/Segmented';
import { StatusBar } from '@/components/ui/StatusBar';
import { TextInput } from '@/components/ui/TextInput';
import { TradeTypeButton } from '@/components/ui/TradeTypeButton';
import type { CongestionLevel, FeedKind, Place, TradeType } from '@/lib/types';

export type WriteMode = 'feed' | 'trade';

const TITLES: Record<WriteMode, string> = {
  feed: '피드 작성',
  trade: '거래글 작성',
};

const KIND_FILTERS: ReadonlyArray<{ id: FeedKind; label: string }> = [
  { id: 'general', label: '🗣 일반' },
  { id: 'report', label: '📢 제보' },
];

const LEVELS: Array<{ id: CongestionLevel; emoji: string; label: string }> = [
  { id: 'empty', emoji: '🟢', label: '여유' },
  { id: 'normal', emoji: '🟡', label: '보통' },
  { id: 'busy', emoji: '🟠', label: '혼잡' },
  { id: 'full', emoji: '🔴', label: '매우혼잡' },
];

interface Props {
  mode: WriteMode;
  /** feed 모드에서 초기 카테고리 */
  defaultKind?: FeedKind;
  places: Place[];
}

export function WriteScreen({ mode, defaultKind = 'general', places }: Props) {
  const { id: avatarId } = useAvatar();
  const [kind, setKind] = useState<FeedKind>(defaultKind);
  const [place, setPlace] = useState<string>(places[0]?.id ?? '');
  const [level, setLevel] = useState<CongestionLevel>('normal');
  const [ttype, setTtype] = useState<TradeType>('buy');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [kakaoId, setKakaoId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isFeed = mode === 'feed';
  const isReport = isFeed && kind === 'report';

  const submit = () => {
    if (mode === 'trade') {
      if (!place) return setError('장소를 선택해주세요');
      if (!title.trim()) return setError('제목을 입력해주세요');
    }
    if (isFeed) {
      if (!note.trim()) return setError('내용을 입력해주세요');
      if (isReport && !place) return setError('제보는 장소가 필요해요');
    }
    setError(null);

    const fd = new FormData();

    if (mode === 'trade') {
      fd.set('place_id', place);
      fd.set('type', ttype);
      fd.set('title', title);
      fd.set('body', note);
      fd.set('price', price);
      fd.set('avatar_id', avatarId);
      if (kakaoId) fd.set('kakao_id', kakaoId);
      startTransition(async () => {
        try {
          await submitTrade(fd);
        } catch (e) {
          setError(e instanceof Error ? e.message : '거래글 등록 실패');
        }
      });
      return;
    }

    // feed (general / report)
    fd.set('kind', kind);
    fd.set('text', note);
    fd.set('avatar_id', avatarId);
    if (place) fd.set('place_id', place);
    if (isReport) fd.set('level', level);
    startTransition(async () => {
      try {
        await submitFeed(fd);
      } catch (e) {
        setError(e instanceof Error ? e.message : '등록 실패');
      }
    });
  };

  const submitLabel =
    mode === 'trade'
      ? '거래글 등록'
      : isReport
        ? '제보 등록'
        : '피드 올리기';

  return (
    <>
      <StatusBar />
      <AppBar title={TITLES[mode]} showBack />
      <div style={{ height: 14 }} />

      {/* Trade type */}
      {mode === 'trade' && (
        <div className="form-sect">
          <div className="form-label">
            📦 유형 <span className="req">*</span>
          </div>
          <div className="trade-type-grid">
            <TradeTypeButton variant="buy" active={ttype === 'buy'} onClick={() => setTtype('buy')}>
              💙 삽니다
            </TradeTypeButton>
            <TradeTypeButton variant="sell" active={ttype === 'sell'} onClick={() => setTtype('sell')}>
              ❤️ 팝니다
            </TradeTypeButton>
          </div>
        </div>
      )}

      {/* Feed category */}
      {isFeed && (
        <div className="form-sect">
          <div className="form-label">
            📂 카테고리 <span className="req">*</span>
          </div>
          <Segmented items={KIND_FILTERS} value={kind} onChange={setKind} />
          <div className="form-hint" style={{ marginTop: 8 }}>
            {kind === 'report'
              ? '혼잡도 제보는 현황판 · 장소 상태에 반영됩니다'
              : '현장 분위기 · 팁 · 잡담 모두 환영!'}
          </div>
        </div>
      )}

      {/* Place */}
      <div className="form-sect">
        <div className="form-label">
          📍 장소
          {(mode === 'trade' || isReport) && <span className="req">*</span>}
        </div>
        <div className="chip-grid">
          {places.map((p) => (
            <Chip key={p.id} active={place === p.id} onClick={() => setPlace(p.id)}>
              {p.emoji} {p.name}
            </Chip>
          ))}
          {isFeed && !isReport && place && (
            <Chip onClick={() => setPlace('')}>✕ 장소 없이</Chip>
          )}
        </div>
      </div>

      {/* Congestion (report only) */}
      {isReport && (
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

      {/* Trade title + price + kakao */}
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
          <div className="form-sect">
            <div className="form-label">
              💬 카카오톡 ID / 오픈채팅 링크{' '}
              <span style={{ fontSize: 11, opacity: 0.6 }}>(선택)</span>
            </div>
            <TextInput
              placeholder="예) kakao_id 또는 https://open.kakao.com/o/..."
              value={kakaoId}
              onChange={(e) => setKakaoId(e.target.value)}
            />
          </div>
        </>
      )}

      {/* Text body */}
      <div className="form-sect">
        <div className="form-label">
          {mode === 'trade'
            ? '📄 내용'
            : isReport
              ? '💬 한 줄 제보'
              : '🗣 하고 싶은 말'}
        </div>
        <TextInput
          placeholder={
            mode === 'trade'
              ? '거래 관련 상세 내용'
              : isReport
                ? '예) 20명 대기, 회전 빠름'
                : '자유롭게 입력하세요'
          }
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error && (
        <div
          className="form-sect"
          style={{ color: 'var(--red)', fontFamily: 'var(--f2)', fontSize: 17 }}
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
