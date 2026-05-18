import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import type { CardItem } from '@/data/cardvault';

/**
 * Owned-card persistence. The app stores the user's collection as a JSON
 * file under the document directory — synced across launches, lost only
 * on uninstall. The store starts empty: nothing the user didn't add
 * themselves should ever appear in their collection.
 */

const FILE_NAME = 'collection.json';

function getFile(): File {
  return new File(Paths.document, FILE_NAME);
}

export function loadCollection(): CardItem[] {
  try {
    const f = getFile();
    if (!f.exists) return [];
    const txt = f.textSync();
    const parsed: unknown = JSON.parse(txt);
    return Array.isArray(parsed) ? (parsed as CardItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCollection(cards: CardItem[]): void {
  const f = getFile();
  if (!f.exists) f.create();
  f.write(JSON.stringify(cards));
  emit();
}

export function addCards(newCards: CardItem[]): CardItem[] {
  const existing = loadCollection();
  // Card identity is (set name + number). Prevents storing the same card
  // twice when the user re-scans for fresh price/grade — we replace in
  // place instead of accumulating duplicates.
  const key = (c: CardItem) => `${c.set}-${c.num}`;
  const byKey = new Map<string, CardItem>();
  for (const c of existing) byKey.set(key(c), c);
  for (const c of newCards) byKey.set(key(c), c);
  const merged = Array.from(byKey.values());
  saveCollection(merged);
  return merged;
}

export function removeCard(id: number): CardItem[] {
  const next = loadCollection().filter((c) => c.id !== id);
  saveCollection(next);
  return next;
}

/** Patch fields on an existing card by id. Returns the updated collection.
 *  No-op when no card matches. */
export function updateCard(id: number, patch: Partial<CardItem>): CardItem[] {
  const list = loadCollection();
  let changed = false;
  const next = list.map((c) => {
    if (c.id !== id) return c;
    changed = true;
    return { ...c, ...patch };
  });
  if (!changed) return list;
  saveCollection(next);
  return next;
}

/**
 * Tiny pub-sub so any open screen refreshes the second the collection
 * mutates — useFocusEffect alone misses the case where two tabs share a
 * mount cycle (e.g. modals over Home).
 */
const subs = new Set<() => void>();
function emit() {
  for (const fn of subs) fn();
}

/** Subscribe a screen to collection changes. Re-reads on mount, on screen
 *  focus, and whenever any other code calls `saveCollection` / `addCards`. */
export function useCollection(): CardItem[] {
  const [cards, setCards] = useState<CardItem[]>(() => loadCollection());

  const refresh = useCallback(() => {
    setCards(loadCollection());
  }, []);

  useFocusEffect(useCallback(() => {
    refresh();
  }, [refresh]));

  useEffect(() => {
    subs.add(refresh);
    return () => {
      subs.delete(refresh);
    };
  }, [refresh]);

  return cards;
}
