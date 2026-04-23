'use client';

import { EVENT_META, STAMP_REWARDS, STAMP_SPOTS } from '@/lib/stamps';

interface Props {
  onClose: () => void;
}

export function StampRallyModal({ onClose }: Props) {
  return (
    <div className="stamp-overlay" onClick={onClose}>
      <div className="stamp-modal" onClick={(e) => e.stopPropagation()}>
        {/* 히어로 헤더 */}
        <div className="stamp-hero">
          <div className="stamp-hero-title">
            {EVENT_META.title.split('×').map((part, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {part.trim()}
              </span>
            ))}
          </div>
          <div className="stamp-hero-sub">
            📅 {EVENT_META.period}
            <br />
            📍 {EVENT_META.location}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="stamp-close"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 진행 방법 */}
        <div className="stamp-sect">
          <div className="stamp-sect-title">📖 참여 방법</div>
          <ol className="stamp-steps">
            <li>포켓몬 GO 앱 실행</li>
            <li>6곳의 포켓스탑(주황 아이콘) 방문</li>
            <li>스탬프 수집 (매 장소 1회)</li>
            <li>보상 센터 방문 → 인증 → 보상 교환</li>
          </ol>
        </div>

        {/* 6개 스탬프 장소 */}
        <div className="stamp-sect">
          <div className="stamp-sect-title">🗺 스탬프 장소 6곳</div>
          <div className="stamp-spots">
            {STAMP_SPOTS.map((s) => (
              <div key={s.no} className="stamp-spot">
                <div className="ss-num">{s.no}</div>
                <div className="ss-emoji" style={{ background: s.bg }}>{s.emoji}</div>
                <div className="ss-main">
                  <div className="ss-name">{s.name}</div>
                  {s.subtitle && <div className="ss-sub">{s.subtitle}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 보상 3-tier */}
        <div className="stamp-sect">
          <div className="stamp-sect-title">🎁 보상</div>
          {STAMP_REWARDS.map((r) => (
            <div key={r.count} className="stamp-reward">
              <div className="sr-badge" style={{ background: r.color }}>
                스탬프 {r.count}개
              </div>
              <div className="sr-emoji">{r.emoji}</div>
              <div className="sr-main">
                <div className="sr-title">
                  {r.title}
                  <span className="sr-summary">· {r.summary}</span>
                </div>
                <div className="sr-desc">{r.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="stamp-cta" onClick={onClose}>
          ▶ 확인 ▶
        </button>
      </div>
    </div>
  );
}
