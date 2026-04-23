'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import type { CongestionLevel } from '@/lib/types';

const LEVELS: readonly CongestionLevel[] = ['empty', 'normal', 'busy', 'full'] as const;

export async function submitReport(formData: FormData): Promise<void> {
  const placeId = String(formData.get('place_id') ?? '');
  const rawLevel = String(formData.get('level') ?? '');
  const note = String(formData.get('note') ?? '').trim();

  if (!placeId) throw new Error('place_id required');
  if (!LEVELS.includes(rawLevel as CongestionLevel)) {
    throw new Error(`invalid level: ${rawLevel}`);
  }
  const level = rawLevel as CongestionLevel;

  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO reports (place_id, level, note) VALUES ($1, $2, $3)`,
        [placeId, level, note],
      );
      await client.query(
        `UPDATE places
         SET level = $2, last_report_at = NOW(), count = count + 1
         WHERE id = $1`,
        [placeId, level],
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // DB 미설정 상태에서도 UX 는 일관되게 — 캐시 무효화 + 리다이렉트
  revalidatePath('/live');
  revalidatePath('/');
  redirect('/live');
}
