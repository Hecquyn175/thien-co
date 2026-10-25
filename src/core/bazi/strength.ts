import { getHiddenStems } from '../ganzhi/hidden-stems';
import { Pillar } from '../ganzhi/pillars';
import { getElementRelation, stemElement } from '../relations/elements';
import { ConfidenceLevel, ElementId } from '../types';

export interface StrengthConfig {
  monthCommandSupportScore: number;
  monthCommandPartialScore: number;
  branchRootMultipliers: {
    year: number;
    month: number;
    day: number;
    hour: number;
  };
  stemSupportScore: {
    year: number;
    month: number;
    hour: number;
  };
  strongThreshold: number;
}

export const DEFAULT_STRENGTH_CONFIG: StrengthConfig = {
  monthCommandSupportScore: 36,
  monthCommandPartialScore: 28,
  branchRootMultipliers: {
    year: 8,
    month: 20,
    day: 14,
    hour: 10,
  },
  stemSupportScore: {
    year: 7,
    month: 11,
    hour: 8,
  },
  strongThreshold: 50,
};

export interface StrengthAnalysis {
  dayMasterElement: ElementId;
  /** Điểm thân vượng 0..100 */
  score: number;
  isStrong: boolean;
  label: 'vuong' | 'nhuoc' | 'can_bang';
  labelVi: string;
  dacLenh: boolean;
  dacDiaScore: number;
  dacTheScore: number;
  elementDistribution: Record<ElementId, number>;
  confidence: ConfidenceLevel;
}

function isSupportRelation(rel: ReturnType<typeof getElementRelation>): boolean {
  return rel === 'ty_hoa' || rel === 'sinh_ta';
}

export function analyzeStrength(
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour?: Pillar },
  cfg: StrengthConfig = DEFAULT_STRENGTH_CONFIG,
): StrengthAnalysis {
  const dmStem = pillars.day.stem;
  const dmEl = stemElement(dmStem);

  const dist: Record<ElementId, number> = {
    kim: 0,
    moc: 0,
    thuy: 0,
    hoa: 0,
    tho: 0,
  };

  // Cộng điểm phân bố ngũ hành (Can lộ + Tàng can có trọng số, trụ tháng nhân 1.8)
  const addStemWeight = (stem: number, w: number) => {
    dist[stemElement(stem)] += w;
  };
  const addBranchWeight = (branch: number, mult: number) => {
    for (const hs of getHiddenStems(branch)) {
      dist[stemElement(hs.stem)] += hs.weight * mult;
    }
  };

  addStemWeight(pillars.year.stem, 1.0);
  addStemWeight(pillars.month.stem, 1.2);
  addStemWeight(pillars.day.stem, 1.0);
  if (pillars.hour) addStemWeight(pillars.hour.stem, 1.0);

  addBranchWeight(pillars.year.branch, 1.0);
  addBranchWeight(pillars.month.branch, 1.8);
  addBranchWeight(pillars.day.branch, 1.2);
  if (pillars.hour) addBranchWeight(pillars.hour.branch, 1.0);

  // 1) Đắc lệnh (Chi tháng)
  const monthHidden = getHiddenStems(pillars.month.branch);
  const mainStemEl = stemElement(monthHidden[0].stem);
  const monthRel = getElementRelation(dmEl, mainStemEl);
  let dacLenhScore = 0;
  let dacLenh = false;
  if (monthRel === 'ty_hoa') {
    dacLenhScore = cfg.monthCommandSupportScore;
    dacLenh = true;
  } else if (monthRel === 'sinh_ta') {
    dacLenhScore = cfg.monthCommandPartialScore;
    dacLenh = true;
  } else {
    // kiểm trung/dư khí của tháng
    for (const hs of monthHidden.slice(1)) {
      if (isSupportRelation(getElementRelation(dmEl, stemElement(hs.stem)))) {
        dacLenhScore += cfg.monthCommandPartialScore * hs.weight * 0.6;
      }
    }
  }

  // 2) Đắc địa (gốc rễ trong các Chi)
  let dacDiaScore = 0;
  const branchSlots: Array<[number, number]> = [
    [pillars.year.branch, cfg.branchRootMultipliers.year],
    [pillars.month.branch, cfg.branchRootMultipliers.month * 0.45],
    [pillars.day.branch, cfg.branchRootMultipliers.day],
  ];
  if (pillars.hour) {
    branchSlots.push([pillars.hour.branch, cfg.branchRootMultipliers.hour]);
  }
  for (const [b, mult] of branchSlots) {
    for (const hs of getHiddenStems(b)) {
      const rel = getElementRelation(dmEl, stemElement(hs.stem));
      if (rel === 'ty_hoa') dacDiaScore += mult * hs.weight;
      else if (rel === 'sinh_ta') dacDiaScore += mult * hs.weight * 0.85;
    }
  }

  // 3) Đắc thế (Can lộ sinh trợ)
  let dacTheScore = 0;
  const stemSlots: Array<[number, number]> = [
    [pillars.year.stem, cfg.stemSupportScore.year],
    [pillars.month.stem, cfg.stemSupportScore.month],
  ];
  if (pillars.hour) {
    stemSlots.push([pillars.hour.stem, cfg.stemSupportScore.hour]);
  }
  for (const [s, w] of stemSlots) {
    const rel = getElementRelation(dmEl, stemElement(s));
    if (rel === 'ty_hoa') dacTheScore += w;
    else if (rel === 'sinh_ta') dacTheScore += w * 0.9;
  }

  // Nếu không rõ giờ sinh, chuẩn hóa thang điểm về 100
  const maxPossible = pillars.hour ? 100 : 82;
  const rawTotal = dacLenhScore + dacDiaScore + dacTheScore;
  const score = Math.max(0, Math.min(100, Math.round((rawTotal / maxPossible) * 100)));

  const isStrong = score >= cfg.strongThreshold;
  const label: StrengthAnalysis['label'] =
    score >= 55 ? 'vuong' : score <= 45 ? 'nhuoc' : 'can_bang';
  const labelVi =
    label === 'vuong' ? 'Thân vượng' : label === 'nhuoc' ? 'Thân nhược' : 'Thân cân bằng';

  return {
    dayMasterElement: dmEl,
    score,
    isStrong,
    label,
    labelVi,
    dacLenh,
    dacDiaScore: Math.round(dacDiaScore * 10) / 10,
    dacTheScore: Math.round(dacTheScore * 10) / 10,
    elementDistribution: dist,
    confidence: 'B',
  };
}
