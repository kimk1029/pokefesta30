'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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

  if (supabase) {
    const { error } = await supabase.from('reports').insert({
      place_id: placeId,
      level,
      note: note || null,
    });
    if (error) throw new Error(`reports insert failed: ${error.message}`);
  }

  // Supabase가 꺼져있어도 캐시 무효화 + 리다이렉트는 그대로 — UX 일관성 유지
  revalidatePath('/live');
  revalidatePath('/');
  redirect('/live');
}
