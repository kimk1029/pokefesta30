'use client';

import { useRef, useState } from 'react';

interface Props {
  /** 현재 선택된 이미지 URL 목록 (컨트롤드) */
  value: string[];
  /** 변경 시 호출 */
  onChange: (urls: string[]) => void;
  /** 최대 장수 (기본 5) */
  max?: number;
}

const MAX_DEFAULT = 5;
const TARGET_MAX_WIDTH = 1280;
const TARGET_QUALITY = 0.82;

/**
 * 클라이언트 캔버스에서 이미지 리사이즈 + JPEG 압축.
 * @returns 압축된 Blob. 실패 시 원본 File 반환.
 */
async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(new Error('read error'));
      r.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('image load error'));
      i.src = dataUrl;
    });
    const ratio = Math.min(1, TARGET_MAX_WIDTH / img.width);
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), 'image/jpeg', TARGET_QUALITY),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export function TradeImagePicker({ value, onChange, max = MAX_DEFAULT }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const remaining = max - value.length;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const take = Array.from(files).slice(0, remaining);
    if (take.length === 0) return;
    setErr(null);
    setUploading(true);

    try {
      // 1) 각 파일 압축
      const blobs = await Promise.all(take.map(compressImage));

      // 2) FormData 로 업로드
      const fd = new FormData();
      blobs.forEach((b, i) => {
        const name = take[i].name.replace(/\.[^.]+$/, '') + '.jpg';
        fd.append('files', b, name);
      });

      const res = await fetch('/api/upload/trade-images', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const { urls } = (await res.json()) as { urls: string[] };
      onChange([...value, ...urls]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (i: number) => {
    const next = [...value];
    next.splice(i, 1);
    onChange(next);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {value.map((url, i) => (
          <div
            key={url}
            style={{
              position: 'relative',
              width: 72,
              height: 72,
              boxShadow:
                '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`업로드 ${i + 1}`}
              width={72}
              height={72}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label="삭제"
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                width: 20,
                height: 20,
                background: 'var(--red)',
                color: 'var(--white)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--f1)',
                fontSize: 10,
                lineHeight: 1,
                boxShadow:
                  '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
              }}
            >
              ✕
            </button>
          </div>
        ))}

        {remaining > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              width: 72,
              height: 72,
              background: 'var(--pap2)',
              border: '2px dashed var(--ink2)',
              cursor: uploading ? 'wait' : 'pointer',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--f1)',
              fontSize: 8,
              color: 'var(--ink2)',
              letterSpacing: 0.3,
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            {uploading ? '업로드중…' : <>
              📷<br />+ 추가<br />({value.length}/{max})
            </>}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {err && (
        <div style={{ marginTop: 8, fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--red)', letterSpacing: 0.3 }}>
          ⚠ {err}
        </div>
      )}
      <div style={{ marginTop: 6, fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)', letterSpacing: 0.3 }}>
        jpg/png/webp · 최대 {max}장 · 자동 압축(가로 1280px, 80% 품질)
      </div>
    </div>
  );
}
