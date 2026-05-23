'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { translate } from '@/lib/cardTranslate';

interface SearchResult {
  apparelId: number;
  name: string;
  imageUrl: string | null;
  priceText: string;
}

export function HomeKoSearchBar() {
  const [query, setQuery] = useState('');
  const [translated, setTranslated] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setSubmitted(false);
      setTranslated('');
      return;
    }
    const ja = translate(trimmed, 'ja');
    setTranslated(ja);
    setLoading(true);
    setSubmitted(true);
    try {
      const res = await fetch(`/api/snkrdunk/search?q=${encodeURIComponent(ja)}`);
      const data = (await res.json()) as { results: SearchResult[] };
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function onClear() {
    setQuery('');
    setResults([]);
    setSubmitted(false);
    setTranslated('');
    inputRef.current?.focus();
  }

  return (
    <div style={{ margin: '0 var(--gap) var(--cg)' }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
        style={{
          position: 'relative',
          height: 44,
          width: '100%',
        }}
      >
        {/* 아이콘 (input 안 좌측) */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 12,
            top: 0,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            fontSize: 14,
            color: 'var(--ink3)',
            pointerEvents: 'none',
          }}
        >
          🔍
        </span>

        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="한국어로 카드 검색 (예: 리자몽, 피카츄)"
          aria-label="스니덩크 한국어 검색"
          style={{
            width: '100%',
            height: 44,
            padding: '0 56px 0 36px',
            border: 'none',
            outline: 'none',
            background: 'var(--white)',
            fontFamily: 'var(--f1)',
            fontSize: 10,
            color: 'var(--ink)',
            letterSpacing: 0.3,
            boxShadow:
              '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),inset 2px 2px 0 rgba(0,0,0,.08),4px 4px 0 var(--ink)',
          }}
        />

        {/* Clear */}
        {query && (
          <button
            type="button"
            onClick={onClear}
            aria-label="검색어 지우기"
            style={{
              position: 'absolute',
              right: 48,
              top: 8,
              width: 28,
              height: 28,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--f1)',
              fontSize: 10,
              color: 'var(--ink3)',
            }}
          >
            ✕
          </button>
        )}

        {/* Submit (input 안 우측) */}
        <button
          type="submit"
          aria-label="검색"
          style={{
            position: 'absolute',
            right: 6,
            top: 6,
            width: 32,
            height: 32,
            border: 'none',
            background: 'var(--ink)',
            color: 'var(--gold)',
            cursor: 'pointer',
            fontFamily: 'var(--f1)',
            fontSize: 12,
            letterSpacing: 0,
            boxShadow:
              '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink),2px 2px 0 var(--yel-dk)',
          }}
        >
          ▶
        </button>
      </form>

      {/* 결과 영역 */}
      {submitted && (
        <div style={{ marginTop: 14 }}>
          {translated && translated !== query.trim() && (
            <div
              style={{
                fontFamily: 'var(--f1)',
                fontSize: 8,
                color: 'var(--ink3)',
                letterSpacing: 0.3,
                marginBottom: 8,
              }}
            >
              🇯🇵 <b>{translated}</b> 로 검색
            </div>
          )}
          {loading ? (
            <div
              style={{
                padding: '20px 0',
                fontFamily: 'var(--f1)',
                fontSize: 9,
                color: 'var(--ink3)',
                textAlign: 'center',
                letterSpacing: 0.3,
              }}
            >
              검색 중...
            </div>
          ) : results.length === 0 ? (
            <div
              style={{
                padding: '20px 0',
                fontFamily: 'var(--f1)',
                fontSize: 9,
                color: 'var(--ink3)',
                textAlign: 'center',
                letterSpacing: 0.3,
              }}
            >
              검색 결과가 없습니다
            </div>
          ) : (
            <>
              <div
                style={{
                  fontFamily: 'var(--f1)',
                  fontSize: 9,
                  color: 'var(--ink3)',
                  letterSpacing: 0.3,
                  marginBottom: 8,
                }}
              >
                검색 결과 {results.length}건
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.map((r) => (
                  <Link
                    key={r.apparelId}
                    href={`/cards/snkrdunk/${r.apparelId}`}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: 10,
                      background: 'var(--white)',
                      textDecoration: 'none',
                      color: 'inherit',
                      alignItems: 'center',
                      boxShadow:
                        '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.7),4px 4px 0 var(--ink)',
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        flexShrink: 0,
                        background: 'var(--pap2)',
                        overflow: 'hidden',
                        boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink)',
                      }}
                    >
                      {r.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.imageUrl}
                          alt={r.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : null}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--f1)',
                          fontSize: 9,
                          letterSpacing: 0.2,
                          color: 'var(--ink)',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {r.name}
                      </div>
                      {r.priceText && (
                        <div
                          style={{
                            fontFamily: 'var(--f1)',
                            fontSize: 10,
                            color: 'var(--red)',
                            letterSpacing: 0.3,
                            marginTop: 4,
                          }}
                        >
                          {r.priceText}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
