import relationsData from '../../data/relations.json';
import { ElementId } from '../types';
import { getElementRelation, stemElement } from './elements';

export type StemRelationType = 'ngu_hop' | 'tuong_xung' | 'tuong_khac';

export interface StemRelationHit {
  type: StemRelationType;
  a: number;
  b: number;
  transformElement?: ElementId;
}

export function checkStemRelation(a: number, b: number): StemRelationHit[] {
  const hits: StemRelationHit[] = [];
  for (const h of relationsData.stemHe) {
    if ((h.pair[0] === a && h.pair[1] === b) || (h.pair[0] === b && h.pair[1] === a)) {
      hits.push({ type: 'ngu_hop', a, b, transformElement: h.transform as ElementId });
    }
  }
  for (const p of relationsData.stemChong) {
    if ((p[0] === a && p[1] === b) || (p[0] === b && p[1] === a)) {
      hits.push({ type: 'tuong_xung', a, b });
    }
  }
  const rel = getElementRelation(stemElement(a), stemElement(b));
  if (rel === 'ta_khac' || rel === 'khac_ta') {
    hits.push({ type: 'tuong_khac', a, b });
  }
  return hits;
}

export type BranchPairRelationType =
  | 'luc_hop'
  | 'luc_xung'
  | 'ban_tam_hop'
  | 'hinh'
  | 'hai'
  | 'pha';

export type HinhSubtype = 'vo_an' | 'y_the' | 'vo_le' | 'tu_hinh';

export interface BranchPairRelationHit {
  type: BranchPairRelationType;
  a: number;
  b: number;
  element?: ElementId;
  hinhSubtype?: HinhSubtype;
}

export function isLucXung(a: number, b: number): boolean {
  return a !== b && Math.abs(a - b) === 6;
}

export function checkBranchPairRelations(a: number, b: number): BranchPairRelationHit[] {
  const hits: BranchPairRelationHit[] = [];

  for (const h of relationsData.lucHop) {
    if ((h.pair[0] === a && h.pair[1] === b) || (h.pair[0] === b && h.pair[1] === a)) {
      hits.push({ type: 'luc_hop', a, b, element: h.transform as ElementId });
    }
  }

  if (isLucXung(a, b)) {
    hits.push({ type: 'luc_xung', a, b });
  }

  if (a !== b) {
    for (const th of relationsData.tamHop) {
      if (th.set.includes(a) && th.set.includes(b)) {
        hits.push({ type: 'ban_tam_hop', a, b, element: th.element as ElementId });
      }
    }
  }

  // Hình
  if (a === b && relationsData.hinh.self.includes(a)) {
    hits.push({ type: 'hinh', a, b, hinhSubtype: 'tu_hinh' });
  } else if (a !== b) {
    for (const p of relationsData.hinh.pairs) {
      if ((p.pair[0] === a && p.pair[1] === b) || (p.pair[0] === b && p.pair[1] === a)) {
        hits.push({ type: 'hinh', a, b, hinhSubtype: p.name as HinhSubtype });
      }
    }
    for (const tr of relationsData.hinh.triples) {
      if (tr.set.includes(a) && tr.set.includes(b)) {
        hits.push({ type: 'hinh', a, b, hinhSubtype: tr.name as HinhSubtype });
      }
    }
  }

  for (const p of relationsData.hai) {
    if ((p[0] === a && p[1] === b) || (p[0] === b && p[1] === a)) {
      hits.push({ type: 'hai', a, b });
    }
  }

  for (const p of relationsData.pha) {
    if ((p[0] === a && p[1] === b) || (p[0] === b && p[1] === a)) {
      hits.push({ type: 'pha', a, b });
    }
  }

  return hits;
}

export interface TripleBranchHit {
  type: 'tam_hop' | 'tam_hoi' | 'tam_hinh';
  branches: [number, number, number];
  element?: ElementId;
  subtype?: HinhSubtype;
}

export function checkTripleBranchRelations(branches: number[]): TripleBranchHit[] {
  const set = new Set(branches);
  const out: TripleBranchHit[] = [];
  for (const th of relationsData.tamHop) {
    if (th.set.every((b) => set.has(b))) {
      out.push({
        type: 'tam_hop',
        branches: [th.set[0], th.set[1], th.set[2]],
        element: th.element as ElementId,
      });
    }
  }
  for (const th of relationsData.tamHoi) {
    if (th.set.every((b) => set.has(b))) {
      out.push({
        type: 'tam_hoi',
        branches: [th.set[0], th.set[1], th.set[2]],
        element: th.element as ElementId,
      });
    }
  }
  for (const tr of relationsData.hinh.triples) {
    if (tr.set.every((b) => set.has(b))) {
      out.push({
        type: 'tam_hinh',
        branches: [tr.set[0], tr.set[1], tr.set[2]],
        subtype: tr.name as HinhSubtype,
      });
    }
  }
  return out;
}
