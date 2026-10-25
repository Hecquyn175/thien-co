/**
 * lint:data — kiểm tra dữ liệu nghiêm ngặt (mục 9.3 & 13):
 * 1. Mọi file JSON trong src/data/ phải hợp lệ và có `meta.source` + `meta.confidence` ∈ A|B|C.
 * 2. Danh mục sự kiện (`src/data/events/*.json`):
 *    - 4 nhóm, mỗi nhóm ≥ 12 sự kiện (tổng ≥ 48).
 *    - Mỗi sự kiện có ≥ 3 situations, ≥ 2 advice.use, ≥ 2 advice.avoid, ≥ 2 advice.remedy.
 *    - Mỗi sự kiện có `confidence` và `source`.
 *    - Nhóm `suc_khoe_di_chuyen`: mọi sự kiện phải có câu nhắc "Nếu thấy không khỏe, hãy hỏi ý kiến bác sĩ" trong advice.
 * 3. Kiểm tra danh sách từ cấm (bệnh cụ thể, tử vong, tai nạn nghiêm trọng, ly hôn, phá sản, bỏ thuốc, hoãn khám...) trên toàn bộ JSON dữ liệu.
 * 4. Kiểm tra không có `Math.random(` và không có câu văn dự đoán cứng trong `src/core/events/*.ts`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = join(process.cwd(), 'src', 'data');
const CORE_EVENTS_DIR = join(process.cwd(), 'src', 'core', 'events');
const errors: string[] = [];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// Danh sách từ/cụm từ cấm theo mục 0 và 9.3
const FORBIDDEN_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bung thư\b/i, reason: 'bệnh cụ thể (ung thư)' },
  { pattern: /\bđột quỵ\b/i, reason: 'bệnh cụ thể (đột quỵ)' },
  { pattern: /\bnhồi máu\b/i, reason: 'bệnh cụ thể (nhồi máu)' },
  { pattern: /\btiểu đường\b/i, reason: 'bệnh cụ thể (tiểu đường)' },
  { pattern: /\btrầm cảm\b/i, reason: 'bệnh cụ thể (trầm cảm)' },
  { pattern: /\btử vong\b/i, reason: 'tử vong' },
  { pattern: /\bchết chóc\b/i, reason: 'tử vong / chết chóc' },
  { pattern: /\bqua đời\b/i, reason: 'qua đời' },
  { pattern: /\btự tử\b/i, reason: 'tự tử' },
  { pattern: /\btai nạn nghiêm trọng\b/i, reason: 'tai nạn nghiêm trọng' },
  { pattern: /\btai nạn chết người\b/i, reason: 'tai nạn nghiêm trọng' },
  { pattern: /\bly hôn\b/i, reason: 'ly hôn' },
  { pattern: /\bly dị\b/i, reason: 'ly dị' },
  { pattern: /\bphá sản\b/i, reason: 'phá sản' },
  { pattern: /\bbỏ thuốc\b/i, reason: 'khuyên bỏ thuốc' },
  { pattern: /\bngưng thuốc\b/i, reason: 'khuyên ngưng thuốc' },
  { pattern: /\bhoãn khám\b/i, reason: 'khuyên hoãn khám' },
];

for (const f of walk(DATA_DIR).filter((p) => p.endsWith('.json'))) {
  try {
    const raw = readFileSync(f, 'utf8');
    const j = JSON.parse(raw);
    if (!j.meta || typeof j.meta.source !== 'string' || !['A', 'B', 'C'].includes(j.meta.confidence)) {
      errors.push(`${f}: thiếu hoặc sai meta.source / meta.confidence (A|B|C)`);
    }
    for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
      if (pattern.test(raw)) {
        errors.push(`${f}: chứa từ cấm [${reason}]`);
      }
    }
  } catch (e) {
    errors.push(`${f}: JSON không hợp lệ (${(e as Error).message})`);
  }
}

const EVENT_FILES = ['nguoi', 'tien_bac', 'cong_viec', 'suc_khoe_di_chuyen'] as const;
let totalEvents = 0;
const allEventIds = new Set<string>();

for (const group of EVENT_FILES) {
  const f = join(DATA_DIR, 'events', `${group}.json`);
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const evs: unknown[] = j.events ?? [];
  if (evs.length < 12) {
    errors.push(`${f}: có ${evs.length} sự kiện (yêu cầu >= 12)`);
  }
  totalEvents += evs.length;

  for (const item of evs as Array<Record<string, unknown>>) {
    const id = String(item.id ?? '');
    if (!id.startsWith(`${group}.`)) {
      errors.push(`${f}: sự kiện '${id}' không bắt đầu bằng '${group}.'`);
    }
    if (allEventIds.has(id)) {
      errors.push(`${f}: trùng id sự kiện '${id}'`);
    }
    allEventIds.add(id);

    if (!item.source || !['A', 'B', 'C'].includes(String(item.confidence))) {
      errors.push(`${f} [${id}]: thiếu source hoặc confidence hợp lệ`);
    }

    const situations = item.situations as string[] | undefined;
    if (!Array.isArray(situations) || situations.length < 3) {
      errors.push(`${f} [${id}]: cần >= 3 situations`);
    } else if (new Set(situations).size !== situations.length) {
      errors.push(`${f} [${id}]: situations bị trùng lặp`);
    }

    const advice = item.advice as { use?: string[]; avoid?: string[]; remedy?: string[] } | undefined;
    if (
      !advice ||
      !Array.isArray(advice.use) ||
      advice.use.length < 2 ||
      !Array.isArray(advice.avoid) ||
      advice.avoid.length < 2 ||
      !Array.isArray(advice.remedy) ||
      advice.remedy.length < 2
    ) {
      errors.push(`${f} [${id}]: advice.use / avoid / remedy mỗi mục cần >= 2 câu`);
    }

    if (group === 'suc_khoe_di_chuyen' && advice) {
      const combinedAdvice = [...(advice.use ?? []), ...(advice.avoid ?? []), ...(advice.remedy ?? [])].join(' ');
      if (!combinedAdvice.includes('Nếu thấy không khỏe, hãy hỏi ý kiến bác sĩ')) {
        errors.push(`${f} [${id}]: thiếu câu 'Nếu thấy không khỏe, hãy hỏi ý kiến bác sĩ' trong advice`);
      }
    }
  }
}

if (totalEvents < 48) {
  errors.push(`Tổng số sự kiện = ${totalEvents} (yêu cầu >= 48)`);
}

// Kiểm tra không dùng Math.random() trong toàn bộ src/core/
const CORE_DIR = join(process.cwd(), 'src', 'core');
for (const f of walk(CORE_DIR).filter((p) => p.endsWith('.ts'))) {
  const code = readFileSync(f, 'utf8');
  // Bỏ comment trước khi tìm Math.random
  const stripped = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  if (stripped.includes('Math.random(')) {
    errors.push(`${f}: phát hiện sử dụng Math.random() trong core`);
  }
}

// Kiểm tra narrator.ts và selector.ts không chứa chuỗi câu dự đoán dài cứng (mọi câu nằm trong src/data/templates/)
for (const f of ['narrator.ts', 'selector.ts', 'scorer.ts']) {
  const p = join(CORE_EVENTS_DIR, f);
  const code = readFileSync(p, 'utf8')
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
    .replace(/\$\{[^}]+\}/g, '');
  const longLiterals = code.match(/['"`][^'"`\n]{80,}['"`]/g) ?? [];
  if (longLiterals.length > 0) {
    errors.push(`${p}: phát hiện chuỗi văn bản cứng dài trong code engine: ${longLiterals[0]}`);
  }
}

if (errors.length) {
  console.error('lint:data FAILED:\n' + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log(`lint:data OK (${totalEvents} sự kiện qua kiểm tra)`);
