import ganzhiData from '../../data/ganzhi.json';
import hiddenData from '../../data/hidden-stems.json';
import { BranchId, StemId } from '../types';

export type HiddenStemRole = 'ban_khi' | 'trung_khi' | 'du_khi';

export interface HiddenStemEntry {
  stem: number;
  stemId: StemId;
  weight: number;
  role: HiddenStemRole;
}

const STEM_INDEX_BY_ID = new Map<string, number>(
  ganzhiData.stems.map((s, idx) => [s.id, idx]),
);

const ROLES: HiddenStemRole[] = ['ban_khi', 'trung_khi', 'du_khi'];

export function getHiddenStems(branchIndex: number): HiddenStemEntry[] {
  const branchDef = ganzhiData.branches[branchIndex];
  if (!branchDef) throw new RangeError(`Branch index không hợp lệ: ${branchIndex}`);
  const bId = branchDef.id as BranchId;
  const stemIds = (hiddenData.branches as Record<string, string[]>)[bId] ?? [];
  const weightTable = (hiddenData.weights as Record<string, number[]>)[String(stemIds.length)] ?? [1];
  return stemIds.map((sid, i) => ({
    stem: STEM_INDEX_BY_ID.get(sid) ?? 0,
    stemId: sid as StemId,
    weight: weightTable[i] ?? 0,
    role: ROLES[i] ?? 'du_khi',
  }));
}
