import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'cards.json'), 'utf8'));

/**
 * Given parsed bottom-left fields + optional name text, score each card and return
 * the top candidates (max 3) sorted by score. Score is multi-signal:
 *   number match (strong) + setCode match (strong) + rarity match + name fuzzy match.
 */
export function matchCandidates({ cardNumber, totalNumber, setCode, rarity, name }) {
  // Hard signal — at least one of these must agree to consider a DB row a match.
  // Rarity alone or name fuzzy alone is not enough (those produced false matches).
  const HARD_NUMBER = 6;
  const HARD_SET = 5;
  const SOFT_TOTAL = 2;
  const SOFT_RARITY = 1; // weak — only a tiebreaker
  const NAME_BONUS_MAX = 4;

  const scored = DB.map((c) => {
    let s = 0;
    let hardHit = false;
    if (cardNumber && c.number === pad3(cardNumber)) {
      s += HARD_NUMBER;
      hardHit = true;
    }
    if (setCode && c.setCode === setCode.toLowerCase()) {
      s += HARD_SET;
      hardHit = true;
    }
    if (totalNumber && c.totalNumber === pad3(totalNumber)) s += SOFT_TOTAL;
    if (rarity && c.rarity === rarity.toUpperCase()) s += SOFT_RARITY;
    if (name) s += Math.min(NAME_BONUS_MAX, nameScore(name, c.name));
    return { c, s, hardHit };
  })
    .filter((x) => x.hardHit)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);

  const max = scored[0]?.s ?? 0;
  const confidence = max >= 11 ? 0.95 : max >= 8 ? 0.78 : max >= 6 ? 0.6 : 0.0;
  return { candidates: scored.map((x) => x.c), confidence };
}

function pad3(n) {
  const s = String(n).replace(/^0+/, '');
  return s.padStart(3, '0');
}

function nameScore(query, target) {
  if (!query || !target) return 0;
  const q = query.replace(/\s/g, '').toLowerCase();
  const t = target.replace(/\s/g, '').toLowerCase();
  if (!q.length) return 0;
  if (t.includes(q) || q.includes(t)) return 4;
  let hits = 0;
  for (const ch of new Set(q)) if (t.includes(ch)) hits += 1;
  return Math.min(3, Math.floor((hits / Math.max(2, q.length)) * 3));
}
