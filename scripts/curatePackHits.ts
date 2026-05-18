/**
 * One-shot curation script.
 *
 * 각 카드 팩의 `searchQuery` 로 스니다 검색 → 상위 N개 apparelId 를 가져와
 * `src/lib/cardPacks.ts` 에 `hits: [...]` 로 직접 박아넣는다.
 *
 * 실행:  npx tsx scripts/curatePackHits.ts
 *
 * 실행 후 git diff 로 변경된 hits 배열만 검토하면 됨. 부적합한 항목은
 * 손으로 지우면 fallback 검색이 그 자리를 메운다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { CARD_PACKS } from '../src/lib/cardPacks';
import { fetchSnkrdunkSearch } from '../src/lib/snkrdunk';

const PER_PACK = 12;
const FILE = 'src/lib/cardPacks.ts';

interface Hit {
  apparelId: number;
  label: string;
}

function shorten(name: string): string {
  const cut = name.split(/[|｜]/)[0].trim();
  return cut.length > 32 ? cut.slice(0, 31) + '…' : cut;
}

async function curatePack(query: string): Promise<Hit[]> {
  const results = await fetchSnkrdunkSearch(query, 1);
  return results
    .slice(0, PER_PACK)
    .map((r) => ({ apparelId: r.apparelId, label: shorten(r.name) }));
}

function formatHitsArray(hits: Hit[]): string {
  if (hits.length === 0) return '[]';
  const inner = hits
    .map((h) => `    { apparelId: ${h.apparelId}, label: ${JSON.stringify(h.label)} },`)
    .join('\n');
  return `[\n${inner}\n    ]`;
}

async function main() {
  const original = readFileSync(FILE, 'utf8');
  let updated = original;
  let any = false;

  for (const pack of CARD_PACKS) {
    process.stdout.write(`[${pack.code}] ${pack.searchQuery} … `);
    const hits = await curatePack(pack.searchQuery);
    if (hits.length === 0) {
      process.stdout.write('0 hits — skip\n');
      continue;
    }
    process.stdout.write(`${hits.length} hits\n`);

    // 해당 팩 객체 블록에서 hits: [...] 또는 hits: [] 부분을 찾아 교체.
    // 같은 객체 내부에서 가장 먼저 등장하는 'hits:' 만 매칭하도록 code 값으로 앵커.
    const codeAnchor = new RegExp(
      `(code:\\s*'${pack.code}'[\\s\\S]*?hits:\\s*)\\[[\\s\\S]*?\\]`,
      'm',
    );
    if (!codeAnchor.test(updated)) {
      console.warn(`  ! could not find hits block for ${pack.code}`);
      continue;
    }
    updated = updated.replace(codeAnchor, (_, prefix: string) => `${prefix}${formatHitsArray(hits)}`);
    any = true;
  }

  if (!any) {
    console.log('nothing changed.');
    return;
  }
  writeFileSync(FILE, updated, 'utf8');
  console.log(`✓ wrote ${FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
