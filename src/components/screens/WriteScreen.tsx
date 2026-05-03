'use client';

import { useRef, useState, useTransition } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { submitFeed, submitTrade } from '@/app/actions';
import { useInventory } from '@/components/InventoryProvider';
import { TradeImagePicker } from '@/components/TradeImagePicker';
import { REWARDS } from '@/lib/rewards';
import { AppBar } from '@/components/ui/AppBar';
import { Chip } from '@/components/ui/Chip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StatusBar } from '@/components/ui/StatusBar';
import { TextInput } from '@/components/ui/TextInput';
import { TradeTypeButton } from '@/components/ui/TradeTypeButton';
import type { Place, TradeType } from '@/lib/types';

export type WriteMode = 'feed' | 'trade';

const TITLES: Record<WriteMode, string> = {
  feed: '커뮤니티 글 작성',
  trade: '거래글 작성',
};

interface Props {
  mode: WriteMode;
  /** 거래 모드에서만 사용 — 만남 장소 칩 */
  places?: Place[];
  /** "내 카드"에서 진입 시 제목/본문 prefill */
  prefill?: { title?: string; body?: string };
}

export function WriteScreen({ mode, places = [], prefill }: Props) {
  const { avatar: avatarId } = useInventory();
  const [place, setPlace] = useState<string>(
    mode === 'trade' ? (places[0]?.id ?? '') : '',
  );
  const [ttype, setTtype] = useState<TradeType>(
    prefill?.title?.startsWith('[판매]') ? 'sell' : 'buy',
  );
  const [title, setTitle] = useState(prefill?.title ?? '');
  const [price, setPrice] = useState('');
  const [kakaoId, setKakaoId] = useState('');
  const [note, setNote] = useState(prefill?.body ?? '');
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submitLockRef = useRef(false);

  const isFeed = mode === 'feed';

  const submit = () => {
    if (pending || submitLockRef.current) return;
    if (mode === 'trade') {
      if (!place) return setError('장소를 선택해주세요');
      if (!title.trim()) return setError('제목을 입력해주세요');
    }
    if (isFeed) {
      if (!note.trim()) return setError('내용을 입력해주세요');
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

    // feed
    fd.set('text', note);
    fd.set('avatar_id', avatarId);
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

  const submitLabel = mode === 'trade' ? '거래글 등록' : '글 올리기';

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

      {/* Place — 거래 전용 */}
      {mode === 'trade' && (
        <div className="form-sect">
          <div className="form-label">
            📍 만남 장소 <span className="req">*</span>
          </div>
          <div className="chip-grid">
            {places.map((p) => (
              <Chip key={p.id} active={place === p.id} onClick={() => setPlace(p.id)}>
                {p.emoji} {p.name}
              </Chip>
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
          {mode === 'trade' ? '📄 내용' : '🗣 하고 싶은 말'}
        </div>
        <TextInput
          placeholder={mode === 'trade' ? '거래 관련 상세 내용' : '자유롭게 입력하세요'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {/* 피드 첨부 사진 */}
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
        {mode === 'trade' ? REWARDS.trade_post : REWARDS.feed_general}P 지급
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
