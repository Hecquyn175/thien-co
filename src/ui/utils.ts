import ganzhiData from '../data/ganzhi.json';
import glossaryData from '../data/glossary.json';
import type { ElementId } from '../core/types';
import type { Pillar } from '../core/ganzhi/pillars';

export function esc(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ELEMENT_META: Record<
  ElementId,
  { vi: string; zh: string; icon: string; cls: string }
> = {
  moc: { vi: 'Mộc', zh: '木', icon: '🌿', cls: 'el-Moc' },
  hoa: { vi: 'Hỏa', zh: '火', icon: '🔥', cls: 'el-Hoa' },
  tho: { vi: 'Thổ', zh: '土', icon: '⛰️', cls: 'el-Tho' },
  kim: { vi: 'Kim', zh: '金', icon: '⚔️', cls: 'el-Kim' },
  thuy: { vi: 'Thủy', zh: '水', icon: '💧', cls: 'el-Thuy' },
};

export function renderElementBadge(el: ElementId, showHan = true): string {
  const m = ELEMENT_META[el] ?? ELEMENT_META.tho;
  const han = showHan ? ` <span class="cjk">(${m.zh})</span>` : '';
  return `<span class="badge ${m.cls}">${m.icon} ${m.vi}${han}</span>`;
}

export function formatStem(stemIdx: number, showHan = true): string {
  const s = ganzhiData.stems[((stemIdx % 10) + 10) % 10];
  return showHan ? `${s.vi} <span class="cjk">${s.han}</span>` : s.vi;
}

export function formatBranch(branchIdx: number, showHan = true): string {
  const b = ganzhiData.branches[((branchIdx % 12) + 12) % 12];
  return showHan ? `${b.vi} <span class="cjk">${b.han}</span>` : b.vi;
}

export function formatGanZhi(gz: Pillar, showHan = true): string {
  const s = ganzhiData.stems[gz.stem];
  const b = ganzhiData.branches[gz.branch];
  if (showHan) {
    return `${s.vi} ${b.vi} <span class="cjk">(${s.han}${b.han})</span>`;
  }
  return `${s.vi} ${b.vi}`;
}

export function formatGanZhiPlain(gz: Pillar): string {
  const s = ganzhiData.stems[gz.stem];
  const b = ganzhiData.branches[gz.branch];
  return `${s.vi} ${b.vi}`;
}

const glossaryMap = new Map(glossaryData.terms.map((t) => [t.id, t]));

export function renderTerm(termId: string, label?: string): string {
  const entry = glossaryMap.get(termId);
  const text = label ?? entry?.term ?? termId;
  return `<button type="button" class="term-link" data-term="${esc(termId)}" title="Bấm để xem giải thích">${esc(text)}</button>`;
}

export function renderConfidenceBadge(level: 'A' | 'B' | 'C' | string): string {
  if (level === 'A') {
    return `<span class="badge badge-good" title="Mức A: Chuẩn thống nhất cao">Độ tin cậy A</span>`;
  }
  if (level === 'B') {
    return `<span class="badge badge-warn" title="Mức B: Có biến thể giữa các sách/trường phái">Độ tin cậy B</span>`;
  }
  return `<span class="badge badge-bad" title="Mức C: Khác biệt lớn giữa các phái — chỉ tham khảo">Độ tin cậy C (Tham khảo)</span>`;
}

export function renderLuckBadge(label: string): string {
  const cls =
    label.includes('Đại cát') || label === 'Cát'
      ? 'badge-good'
      : label === 'Bình hòa'
        ? 'badge-warn'
        : 'badge-bad';
  const icon =
    label.includes('Đại cát')
      ? '☀️'
      : label === 'Cát'
        ? '🌤️'
        : label === 'Bình hòa'
          ? '⚖️'
          : label.includes('Hung')
            ? '🌧️'
            : '⚡';
  return `<span class="badge ${cls}">${icon} ${esc(label)}</span>`;
}
