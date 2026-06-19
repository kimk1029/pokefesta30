/** schema.org 구조화 데이터(JSON-LD) 주입. 서버 컴포넌트에서 렌더. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify 결과만 주입 — 사용자 입력은 호출부에서 plainExcerpt 등으로 정리.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
