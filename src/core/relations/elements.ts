import ganzhiData from '../../data/ganzhi.json';
import { ElementId } from '../types';

export type ElementRelation = 'ty_hoa' | 'ta_sinh' | 'sinh_ta' | 'ta_khac' | 'khac_ta';

/** Chu trình tương sinh: Mộc → Hỏa → Thổ → Kim → Thủy → Mộc */
const SHENG_NEXT: Record<ElementId, ElementId> = {
  moc: 'hoa',
  hoa: 'tho',
  tho: 'kim',
  kim: 'thuy',
  thuy: 'moc',
};

/** Chu trình tương khắc: Mộc → Thổ → Thủy → Hỏa → Kim → Mộc */
const KE_NEXT: Record<ElementId, ElementId> = {
  moc: 'tho',
  tho: 'thuy',
  thuy: 'hoa',
  hoa: 'kim',
  kim: 'moc',
};

export function elementGenerates(e: ElementId): ElementId {
  return SHENG_NEXT[e];
}

export function elementGeneratedBy(e: ElementId): ElementId {
  for (const [k, v] of Object.entries(SHENG_NEXT) as [ElementId, ElementId][]) {
    if (v === e) return k;
  }
  return e;
}

export function elementControls(e: ElementId): ElementId {
  return KE_NEXT[e];
}

export function elementControlledBy(e: ElementId): ElementId {
  for (const [k, v] of Object.entries(KE_NEXT) as [ElementId, ElementId][]) {
    if (v === e) return k;
  }
  return e;
}

/** Quan hệ từ `self` (Nhật chủ/ta) tới `other`. */
export function getElementRelation(self: ElementId, other: ElementId): ElementRelation {
  if (self === other) return 'ty_hoa';
  if (SHENG_NEXT[self] === other) return 'ta_sinh';
  if (SHENG_NEXT[other] === self) return 'sinh_ta';
  if (KE_NEXT[self] === other) return 'ta_khac';
  return 'khac_ta';
}

export function stemElement(stemIndex: number): ElementId {
  return ganzhiData.stems[stemIndex].element as ElementId;
}

export function stemIsYang(stemIndex: number): boolean {
  return ganzhiData.stems[stemIndex].yang;
}

export function branchElement(branchIndex: number): ElementId {
  return ganzhiData.branches[branchIndex].element as ElementId;
}

export function branchIsYang(branchIndex: number): boolean {
  return ganzhiData.branches[branchIndex].yang;
}

export function elementVi(el: ElementId): string {
  return ganzhiData.elements.find((e) => e.id === el)?.vi ?? el;
}

export function elementHan(el: ElementId): string {
  return ganzhiData.elements.find((e) => e.id === el)?.han ?? el;
}
