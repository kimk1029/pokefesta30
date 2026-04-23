import { Pool, type PoolConfig } from 'pg';

/**
 * DB 연결 선택 규칙
 *   APP_ENV=production  → DATABASE_URL_PRODUCTION
 *   그 외 (미지정/staging) → DATABASE_URL_STAGING (기본: 시놀로지)
 *
 * 과도기 호환: DATABASE_URL 이 있으면 staging 값 대체로 사용.
 * 값이 전혀 없으면 pool === null → queries.ts 가 mock 데이터로 폴백.
 */
function resolveDatabaseUrl(): string | null {
  const isProd = process.env.APP_ENV === 'production';
  const url = isProd
    ? process.env.DATABASE_URL_PRODUCTION
    : (process.env.DATABASE_URL_STAGING ?? process.env.DATABASE_URL);
  return url && url.length > 0 ? url : null;
}

function buildPool(): Pool | null {
  const url = resolveDatabaseUrl();
  if (!url) return null;

  const config: PoolConfig = {
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
  };

  // Synology/self-signed 인증서 허용. 프로덕션에선 정식 인증서 권장.
  if (process.env.DATABASE_SSL_INSECURE === '1') {
    config.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(config);
  pool.on('error', (err) => {
    console.error('[db] pool error:', err);
  });
  return pool;
}

// Next.js dev hot-reload 방지용 전역 캐시
declare global {

  var __pf30_pool: Pool | null | undefined;
}

export const pool: Pool | null =
  globalThis.__pf30_pool !== undefined
    ? globalThis.__pf30_pool
    : (globalThis.__pf30_pool = buildPool());

export const isDbConfigured = pool !== null;

export const dbEnv: 'production' | 'staging' =
  process.env.APP_ENV === 'production' ? 'production' : 'staging';
