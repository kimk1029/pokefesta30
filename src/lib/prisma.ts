import { PrismaClient } from '@prisma/client';

/**
 * APP_ENV 에 따라 런타임 DB URL 을 선택.
 *   - APP_ENV=production + DATABASE_URL_PRODUCTION → prod DB
 *   - 그 외 (기본/staging) → DATABASE_URL (= staging)
 *
 * Prisma CLI(migrate/generate) 는 항상 DATABASE_URL 환경변수만 읽으므로,
 * .env 의 DATABASE_URL 은 staging 값으로 유지하는 것이 권장.
 */
function resolveDatabaseUrl(): string | undefined {
  if (process.env.APP_ENV === 'production' && process.env.DATABASE_URL_PRODUCTION) {
    return process.env.DATABASE_URL_PRODUCTION;
  }
  return process.env.DATABASE_URL;
}

declare global {

  var __pf30_prisma: PrismaClient | undefined;
}

function buildClient(): PrismaClient {
  const url = resolveDatabaseUrl();
  if (!url) return new PrismaClient();
  return new PrismaClient({ datasourceUrl: url });
}

export const prisma: PrismaClient = globalThis.__pf30_prisma ?? buildClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pf30_prisma = prisma;
}
