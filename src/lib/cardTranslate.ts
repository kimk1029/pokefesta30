// 웹·모바일·NAS 서버 공유 단일 매퍼 — 실제 사전·엔진은 [[/shared/cardTranslate.ts]] 에.
// 이 파일은 기존 `@/lib/cardTranslate` import 경로(웹 + server/routes/cardLang.ts의
// `@/lib` alias) 호환을 위한 re-export shim.
export * from '../../shared/cardTranslate';
