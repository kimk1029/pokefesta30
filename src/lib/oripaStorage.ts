import type { OripaTicket } from './types';

const keyFor = (packId: string) => `oripa:tickets:${packId}`;

export function loadOripaTickets(packId: string): OripaTicket[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(keyFor(packId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as OripaTicket[];
  } catch {
    return null;
  }
}

export function saveOripaTickets(packId: string, tickets: OripaTicket[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(keyFor(packId), JSON.stringify(tickets));
  } catch {
    // quota / disabled storage — ignore
  }
}
