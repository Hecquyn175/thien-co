import { ConfidenceLevel, EventGroup, ExplainNode, Palace, Signal } from '../types';
import { FactMap, SignalBundle } from './signals';

export interface LeafCondition {
  signal: string;
  is?: string;
  in?: string[];
  notIn?: string[];
}

export interface MatchClause {
  all?: Array<LeafCondition | MatchClause>;
  any?: Array<LeafCondition | MatchClause>;
  none?: Array<LeafCondition | MatchClause>;
}

export interface ConflictRule {
  id: string;
  mode: 'dampen' | 'suppress';
  factor?: number;
}

export interface EventDefinition {
  id: string;
  group: EventGroup;
  title: string;
  baseWeight: number;
  match: MatchClause;
  weights: Record<string, number>;
  polarityRule: 'net_valence' | 'fixed:thuan' | 'fixed:nghich' | 'fixed:trung_tinh';
  situations: string[];
  advice: {
    use: string[];
    avoid: string[];
    remedy: string[];
  };
  conflictsWith?: ConflictRule[];
  ref?: {
    palaceHint?: Palace;
    directionHint?: 'hy_than' | 'tai_than' | 'hac_than';
  };
  source: string;
  confidence: ConfidenceLevel;
}

function isLeaf(cond: LeafCondition | MatchClause): cond is LeafCondition {
  return 'signal' in cond;
}

export function evaluateCondition(
  cond: LeafCondition | MatchClause,
  facts: FactMap,
): boolean {
  if (isLeaf(cond)) {
    const vals = facts[cond.signal] ?? [];
    if (cond.is !== undefined) {
      return vals.includes(cond.is);
    }
    if (cond.in !== undefined) {
      return cond.in.some((v) => vals.includes(v));
    }
    if (cond.notIn !== undefined) {
      return cond.notIn.every((v) => !vals.includes(v));
    }
    return vals.length > 0;
  }
  return evaluateMatchClause(cond, facts);
}

/**
 * Bộ đánh giá điều kiện `match` (all/any/none), hỗ trợ lồng nhau.
 */
export function evaluateMatchClause(clause: MatchClause, facts: FactMap): boolean {
  if (clause.all && clause.all.length > 0) {
    if (!clause.all.every((c) => evaluateCondition(c, facts))) return false;
  }
  if (clause.any && clause.any.length > 0) {
    if (!clause.any.some((c) => evaluateCondition(c, facts))) return false;
  }
  if (clause.none && clause.none.length > 0) {
    if (clause.none.some((c) => evaluateCondition(c, facts))) return false;
  }
  return true;
}

export interface SlotMultipliers {
  day: number;
  hour: number;
  month: number;
  year: number;
  luck: number;
  unknownBirthHourPenalty: number;
}

export const DEFAULT_SLOT_MULTIPLIERS: SlotMultipliers = {
  day: 1.0,
  hour: 0.7,
  month: 0.4,
  year: 0.25,
  luck: 0.3,
  unknownBirthHourPenalty: 0.88,
};

function slotMultiplierForSignalId(sigId: string, cfg: SlotMultipliers): number {
  if (sigId.includes('.hour_') || sigId.startsWith('qimen.')) return cfg.hour;
  if (sigId.includes('.month_') || sigId.includes('.luu_nguyet')) return cfg.month;
  if (sigId.includes('.year_') || sigId.includes('.luu_nien')) return cfg.year;
  if (sigId.startsWith('luck_cycle.') || sigId.includes('.luck_')) return cfg.luck;
  return cfg.day;
}

export interface ScoredSignalContribution {
  signal: Signal;
  weight: number;
  slotMultiplier: number;
  points: number;
  signedValencePoints: number;
}

export interface ScoredEvent {
  def: EventDefinition;
  matched: boolean;
  rawScore: number;
  score: number;
  direction: 'thuan' | 'nghich' | 'trung_tinh';
  netValence: number;
  intensity: 1 | 2 | 3 | 4 | 5;
  convergenceConfidence: 'thap' | 'vua' | 'cao';
  distinctLayerCount: number;
  contributions: ScoredSignalContribution[];
  palace?: Palace;
  windows: number[];
  dampenedBy?: string[];
  explainTree?: ExplainNode;
}

export function scoreSingleEvent(
  def: EventDefinition,
  bundle: SignalBundle,
  cfg: SlotMultipliers = DEFAULT_SLOT_MULTIPLIERS,
  allowRelaxedFallback = false,
): ScoredEvent | null {
  const strictMatched = evaluateMatchClause(def.match, bundle.facts);
  if (!strictMatched && !allowRelaxedFallback) {
    return null;
  }

  const contributions: ScoredSignalContribution[] = [];
  for (const [sigId, w] of Object.entries(def.weights)) {
    const sig = bundle.signalById.get(sigId);
    if (!sig) continue;
    const slotMult = slotMultiplierForSignalId(sigId, cfg);
    const points = w * sig.strength * slotMult;
    const signedValencePoints = points * sig.valence;
    contributions.push({
      signal: sig,
      weight: w,
      slotMultiplier: slotMult,
      points,
      signedValencePoints,
    });
  }

  // Nếu không có signal nào trong `weights` kích hoạt nhưng match đúng:
  // thu thập các signal từ chính điều kiện `match` để đảm bảo mọi sự kiện được chọn đều có signal hỗ trợ và explain không rỗng
  if (contributions.length === 0 && strictMatched) {
    const fallbackSignals = collectMatchingSignalsFromClause(def.match, bundle);
    for (const sig of fallbackSignals) {
      const slotMult = slotMultiplierForSignalId(sig.id, cfg);
      const points = 1.0 * sig.strength * slotMult;
      contributions.push({
        signal: sig,
        weight: 1.0,
        slotMultiplier: slotMult,
        points,
        signedValencePoints: points * sig.valence,
      });
    }
  }

  if (contributions.length === 0) {
    return null;
  }

  const birthHourFactor =
    bundle.chart && !bundle.chart.birthTimeKnown ? cfg.unknownBirthHourPenalty : 1.0;
  const fallbackFactor = strictMatched ? 1.0 : 0.55;
  const sumPoints = contributions.reduce((acc, c) => acc + c.points, 0);
  const rawScore = def.baseWeight * sumPoints * birthHourFactor * fallbackFactor;
  if (rawScore <= 0) return null;

  const totalAbsPoints = contributions.reduce((acc, c) => acc + Math.abs(c.points), 0) || 1;
  const netValence =
    contributions.reduce((acc, c) => acc + c.signedValencePoints, 0) / totalAbsPoints;

  let direction: 'thuan' | 'nghich' | 'trung_tinh';
  if (def.polarityRule === 'fixed:thuan') direction = 'thuan';
  else if (def.polarityRule === 'fixed:nghich') direction = 'nghich';
  else if (def.polarityRule === 'fixed:trung_tinh') direction = 'trung_tinh';
  else {
    direction = netValence >= 0.12 ? 'thuan' : netValence <= -0.12 ? 'nghich' : 'trung_tinh';
  }

  const distinctLayers = new Set(contributions.map((c) => c.signal.layer));
  const distinctLayerCount = distinctLayers.size;
  const convergenceConfidence: 'thap' | 'vua' | 'cao' =
    distinctLayerCount >= 3 ? 'cao' : distinctLayerCount === 2 ? 'vua' : 'thap';

  const intensity = computeIntensity(rawScore);

  const winSet = new Set<number>();
  let detectedPalace: Palace | undefined = def.ref?.palaceHint;
  for (const c of contributions) {
    if (c.signal.palace && !detectedPalace) detectedPalace = c.signal.palace;
    if (c.signal.window) c.signal.window.forEach((h) => winSet.add(h));
  }

  return {
    def,
    matched: strictMatched,
    rawScore: Math.round(rawScore * 100) / 100,
    score: Math.round(rawScore * 100) / 100,
    direction,
    netValence: Math.round(netValence * 100) / 100,
    intensity,
    convergenceConfidence,
    distinctLayerCount,
    contributions,
    palace: detectedPalace,
    windows: Array.from(winSet).sort((a, b) => a - b),
  };
}

function collectMatchingSignalsFromClause(
  clause: MatchClause,
  bundle: SignalBundle,
): Signal[] {
  const out: Signal[] = [];
  const visit = (c: LeafCondition | MatchClause) => {
    if (isLeaf(c)) {
      const vals = bundle.facts[c.signal] ?? [];
      for (const v of vals) {
        const sig = bundle.signalById.get(`${c.signal}.${v}`);
        if (sig && !out.some((x) => x.id === sig.id)) out.push(sig);
      }
    } else {
      c.all?.forEach(visit);
      c.any?.forEach(visit);
    }
  };
  visit(clause);
  return out;
}

export function computeIntensity(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score >= 3.8) return 5;
  if (score >= 2.7) return 4;
  if (score >= 1.8) return 3;
  if (score >= 1.0) return 2;
  return 1;
}
