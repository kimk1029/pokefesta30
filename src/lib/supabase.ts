import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser-safe Supabase client.
 * Returns null when env vars are missing so screens can fall back to mock data
 * (useful during task 1 scaffold; wired up for real in task 2).
 */
export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon) : null;

export const isSupabaseConfigured = Boolean(url && anon);
