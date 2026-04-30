'use client';

import { useRef, useState, useTransition } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { submitFeed, submitTrade } from '@/app/actions';
import { useInventory } from '@/components/InventoryProvider';
import { TradeImagePicker } from '@/components/TradeImagePicker';
import { REWARDS } from '@/lib/rewards';
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
  const { avatar: avatarId } = useInventory();
  const [kind, setKind] = useState<FeedKind>(defaultKind);
  // 피드는 기본 "장소 없음", 거래는 첫 장소를 기본으로
  const [place, setPlace] = useState<string>(
    mode === 'feed' ? '' : (places[0]?.id ?? ''),
  );
  const [level, setLevel] = useState<CongestionLevel>('normal');
  const [ttype, setTtype] = useState<TradeType>('buy');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [kakaoId, setKakaoId] = useState('');
  const [note, setNote] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submitLockRef = useRef(false);

  const isFeed = mode === 'feed';
  const isReport = isFeed && kind === 'report';

  const submit = () => {
    if (pending || submitLockRef.current) return;
    if (mode === 'trade') {
      if (!place) return setError('장소를 선택해주세요');
      if (!title.trim()) return setError('제목을 입력해주세요');
    }
    if (isFeed) {
      if (!note.trim()) return setError('내용을 입력해주세요');
      if (isReport && !place) return setError('제보는 장소가 필요해요');
    }
    setError(null);
    submitLockRef.current = true;

    const fd = new FormData();

    if (mode === 'trade') {
      fd.set('place_id', place);
      fd.set('type', ttype);
      fd.set('title', title);
      fd.set('body', note);
      fd.set('price', price);
      fd.set('avatar_id', avatarId);
      if (kakaoId) fd.set('kakao_id', kakaoId);
      if (images.length > 0) fd.set('images', JSON.stringify(images));
      startTransition(async () => {
        try {
          await submitTrade(fd);
        } catch (e) {
          if (isRedirectError(e)) throw e;
          submitLockRef.current = false;
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
    if (images.length > 0) fd.set('images', JSON.stringify(images));
    startTransition(async () => {
      try {
        await submitFeed(fd);
      } catch (e) {
        if (isRedirectError(e)) throw e;
        submitLockRef.current = false;
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
              placeholder="예) 15,000 / 정가 / 협의"
              value={price}
              onChange={(e) => {
                const raw = e.target.value;
                // 숫자만 있으면 3자리 콤마 자동 포맷. 다른 문자 섞이면 그대로 둠.
                const digitsOnly = raw.replace(/,/g, '');
                if (/^\d+$/.test(digitsOnly)) {
                  setPrice(Number(digitsOnly).toLocaleString('ko-KR'));
                } else {
                  setPrice(raw);
                }
              }}
              inputMode="numeric"
            />
          </div>
          <div className="form-sect">
            <div className="form-label">
              💬 카카오톡 ID / 오픈채팅 링크{' '}
              <span style={{ fontSize: 10, opacity: 0.6 }}>(선택)</span>
            </div>
            <TextInput
              placeholder="예) kakao_id 또는 https://open.kakao.com/o/..."
              value={kakaoId}
              onChange={(e) => setKakaoId(e.target.value)}
            />
          </div>
          <div className="form-sect">
            <div className="form-label">
              📷 상품 사진 <span style={{ fontSize: 10, opacity: 0.6 }}>(선택)</span>
            </div>
            <TradeImagePicker value={images} onChange={setImages} max={5} />
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

      {/* 피드 첨부 사진 (선택) — 상세 펼침 시에만 노출됨 */}
      {isFeed && (
        <div className="form-sect">
          <div className="form-label">
            📷 사진 첨부 <span style={{ fontSize: 10, opacity: 0.6 }}>(선택, 최대 3장 · 펼쳐야 보임)</span>
          </div>
          <TradeImagePicker
            value={images}
            onChange={setImages}
            max={3}
            endpoint="/api/upload/feed-images"
          />
        </div>
      )}

      {error && (
        <div
          className="form-sect"
          style={{ color: 'var(--red)', fontFamily: 'var(--f2)', fontSize: 16 }}
        >
          ⚠ {error}
        </div>
      )}

      <div
        style={{
          margin: '0 var(--gap) 6px',
          padding: '8px 12px',
          background: 'var(--pap2)',
          fontFamily: 'var(--f1)',
          fontSize: 8,
          color: 'var(--ink2)',
          letterSpacing: 0.3,
          lineHeight: 1.6,
          textAlign: 'center',
          boxShadow:
            '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
        }}
      >
        🪙 작성 시 +
        {mode === 'trade'
          ? REWARDS.trade_post
          : isReport
            ? REWARDS.feed_report
            : REWARDS.feed_general}
        P 지급
        {mode === 'trade' && <> · 거래 완료 시 +{REWARDS.trade_done}P</>}
      </div>

      <PrimaryButton onClick={submit} disabled={pending}>
        {pending ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span
              aria-hidden
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: '2px solid var(--ink)',
                background: `linear-gradient(to bottom,
                  var(--red) 0,var(--red) 46%,
                  var(--ink) 46%,var(--ink) 54%,
                  var(--white) 54%,var(--white) 100%)`,
                position: 'relative',
                animation: 'pf-ball-spin 0.7s linear infinite',
                display: 'inline-block',
                verticalAlign: 'middle',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--white)',
                  border: '1.5px solid var(--ink)',
                  transform: 'translate(-50%,-50%)',
                }}
              />
            </span>
            등록 중...
          </span>
        ) : (
          `▶ ${submitLabel} ▶`
        )}
      </PrimaryButton>
    </>
  );
}
