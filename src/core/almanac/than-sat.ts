import thanSatData from '../../data/than-sat.json';
import { Pillar } from '../ganzhi/pillars';
import { checkBranchPairRelations } from '../relations/stem-branch-relations';
import { LunarDate } from '../time/lunar-vn';
import { ConfidenceLevel } from '../types';

export interface ThanSatHit {
  id: string;
  vi: string;
  han: string;
  nature: 'cat' | 'hung';
  ruleDesc: string;
  summary: string;
  source: string;
  confidence: ConfidenceLevel;
}

interface RawStarDef {
  id: string;
  vi: string;
  han: string;
  nature: 'cat' | 'hung';
  ruleType: string;
  ruleDesc: string;
  map?: Record<string, number | { stem?: number; branch?: number }>;
  days?: number[];
  pairs?: [number, number][];
  summary: string;
  source: string;
  confidence: ConfidenceLevel;
}

export const ALL_THAN_SAT_DEFS: ReadonlyArray<RawStarDef> =
  thanSatData.stars as unknown as RawStarDef[];

export function evaluateThanSat(
  monthBranch: number,
  dayPillar: Pillar,
  lunar: LunarDate,
): ThanSatHit[] {
  const hits: ThanSatHit[] = [];
  const mbKey = String(monthBranch);
  const lmKey = String(lunar.month);

  for (const star of ALL_THAN_SAT_DEFS) {
    let matched = false;
    switch (star.ruleType) {
      case 'by_month_branch_to_day_stem_or_branch': {
        const target = star.map?.[mbKey] as { stem?: number; branch?: number } | undefined;
        if (target) {
          if (target.stem !== undefined && target.stem === dayPillar.stem) matched = true;
          if (target.branch !== undefined && target.branch === dayPillar.branch) matched = true;
        }
        break;
      }
      case 'by_month_branch_to_day_stem': {
        const targetStem = star.map?.[mbKey];
        if (typeof targetStem === 'number' && targetStem === dayPillar.stem) matched = true;
        break;
      }
      case 'by_month_branch_to_day_branch': {
        const targetBranch = star.map?.[mbKey];
        if (typeof targetBranch === 'number' && targetBranch === dayPillar.branch) matched = true;
        break;
      }
      case 'by_lunar_month_to_day_branch': {
        const targetBranch = star.map?.[lmKey];
        if (typeof targetBranch === 'number' && targetBranch === dayPillar.branch) matched = true;
        break;
      }
      case 'by_lunar_day_list': {
        if (star.days?.includes(lunar.day)) matched = true;
        break;
      }
      case 'by_lunar_month_day_pairs': {
        if (star.pairs?.some(([m, d]) => m === lunar.month && d === lunar.day)) matched = true;
        break;
      }
      case 'month_day_tam_hop': {
        const rels = checkBranchPairRelations(monthBranch, dayPillar.branch);
        if (rels.some((r) => r.type === 'ban_tam_hop')) matched = true;
        break;
      }
      case 'month_day_luc_hop': {
        const rels = checkBranchPairRelations(monthBranch, dayPillar.branch);
        if (rels.some((r) => r.type === 'luc_hop')) matched = true;
        break;
      }
      case 'month_day_xung': {
        const rels = checkBranchPairRelations(monthBranch, dayPillar.branch);
        if (rels.some((r) => r.type === 'luc_xung')) matched = true;
        break;
      }
    }

    if (matched) {
      hits.push({
        id: star.id,
        vi: star.vi,
        han: star.han,
        nature: star.nature,
        ruleDesc: star.ruleDesc,
        summary: star.summary,
        source: star.source,
        confidence: star.confidence,
      });
    }
  }

  return hits;
}
