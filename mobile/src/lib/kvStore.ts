/**
 * 단순 JSON 키-값 저장소. session.ts 와 동일하게 expo-file-system 사용.
 * AsyncStorage 의존을 피해 신규 deps 없이 동기 fallback 가능한 캐시.
 *
 * 사용: getString('key'), setString('key', 'value')
 *      getJson<T>('key'), setJson('key', { ... })
 */
import { File, Paths } from 'expo-file-system';

const FILE_NAME = 'kvstore.json';

function getFile(): File {
  return new File(Paths.document, FILE_NAME);
}

let memo: Record<string, string> | undefined;

function loadAll(): Record<string, string> {
  if (memo !== undefined) return memo;
  try {
    const f = getFile();
    if (!f.exists) {
      memo = {};
      return memo;
    }
    const raw = f.textSync();
    memo = JSON.parse(raw) as Record<string, string>;
    return memo;
  } catch {
    memo = {};
    return memo;
  }
}

function saveAll(): void {
  if (!memo) return;
  try {
    const f = getFile();
    f.write(JSON.stringify(memo));
  } catch {
    // ignore — preferences are best-effort
  }
}

export function getString(key: string): string | null {
  return loadAll()[key] ?? null;
}

export function setString(key: string, value: string): void {
  const all = loadAll();
  all[key] = value;
  saveAll();
}

export function getJson<T>(key: string): T | null {
  const s = getString(key);
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export function setJson(key: string, value: unknown): void {
  setString(key, JSON.stringify(value));
}
