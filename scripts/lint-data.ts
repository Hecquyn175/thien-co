/**
 * lint:data — kiểm tra dữ liệu. (Khung; được mở rộng ở giai đoạn 4 và 6.)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DATA = join(process.cwd(), 'src', 'data');
const errors: string[] = [];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

for (const f of walk(DATA).filter((p) => p.endsWith('.json'))) {
  try {
    const j = JSON.parse(readFileSync(f, 'utf8'));
    if (!j.meta || !j.meta.source || !j.meta.confidence) errors.push(`${f}: thiếu meta.source/confidence`);
  } catch (e) {
    errors.push(`${f}: JSON không hợp lệ (${(e as Error).message})`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('lint:data OK');
