import ganzhiData from '../../data/ganzhi.json';
import { computeDayAlmanac, DayAlmanac, HourSlotInfo } from '../almanac/gio-dep';
import { BaziChart } from '../bazi/chart';
import { classifyElementForUsefulGod } from '../bazi/useful-god';
import { formatDateISOFromJdn } from '../events/narrator';
import { branchElement, stemElement } from '../relations/elements';
import { checkBranchPairRelations } from '../relations/stem-branch-relations';
import { getTenGod, TEN_GOD_META } from '../relations/ten-gods';
import { getPurposeById, PurposeDef, PurposeId } from './purposes';

export type PickerRangeDays = 7 | 30 | 60 | 90 | 180;

export interface RankedDayItem {
  dateISO: string;
  jdn: number;
  almanac: DayAlmanac;
  dayPillarVi: string;
  lunarVi: string;
  score: number;
  reasons: string[];
  avoidReasons: string[];
  top3Hours: HourSlotInfo[];
}

export interface DatePickerResult {
  purpose: PurposeDef;
  rangeDays: number;
  topDays: RankedDayItem[];
  avoidDays: RankedDayItem[];
  allEvaluated: RankedDayItem[];
}

function evaluatePersonalFit(
  almanac: DayAlmanac,
  chart: BaziChart,
  purpose: PurposeDef,
  roleLabel: string,
  reasons: string[],
  avoidReasons: string[],
): number {
  let delta = 0;
  const dp = almanac.dayPillar;

  // 1) Quan hệ với Nhật chi & Niên chi
  const dayRels = checkBranchPairRelations(dp.branch, chart.day.pillar.branch);
  const yearRels = checkBranchPairRelations(dp.branch, chart.year.pillar.branch);

  if (dayRels.some((r) => r.type === 'luc_xung')) {
    delta -= 28;
    avoidReasons.push(`Xung Nhật chi của ${roleLabel} (${ganzhiData.branches[chart.day.pillar.branch].vi})`);
  } else if (dayRels.some((r) => r.type === 'luc_hop' || r.type === 'ban_tam_hop')) {
    delta += 14;
    reasons.push(`Hợp Nhật chi của ${roleLabel}`);
  }

  if (yearRels.some((r) => r.type === 'luc_xung')) {
    delta -= 22;
    avoidReasons.push(`Xung tuổi (Niên chi ${ganzhiData.branches[chart.year.pillar.branch].vi}) của ${roleLabel}`);
  } else if (yearRels.some((r) => r.type === 'luc_hop' || r.type === 'ban_tam_hop')) {
    delta += 10;
    reasons.push(`Hợp tuổi (Niên chi) của ${roleLabel}`);
  }

  // 2) Dụng thần
  const stemCls = classifyElementForUsefulGod(stemElement(dp.stem), chart.usefulGod);
  const branchCls = classifyElementForUsefulGod(branchElement(dp.branch), chart.usefulGod);
  if (stemCls === 'dung') {
    delta += 10;
    reasons.push(`Can ngày trợ Dụng thần (${roleLabel})`);
  } else if (stemCls === 'ky') {
    delta -= 8;
  }
  if (branchCls === 'dung') {
    delta += 12;
    reasons.push(`Chi ngày trợ Dụng thần (${roleLabel})`);
  } else if (branchCls === 'ky') {
    delta -= 9;
  }

  // 3) Thập thần phù hợp mục đích
  const tg = getTenGod(chart.dayMasterStem, dp.stem);
  if (purpose.preferredTenGods.includes(tg)) {
    delta += 9;
    reasons.push(`Can ngày là ${TEN_GOD_META[tg].vi} hợp việc ${purpose.vi.toLowerCase()}`);
  }

  return delta;
}

export function rankDatesForPurpose(
  startInstant: number,
  rangeDays: PickerRangeDays | number,
  purposeId: PurposeId,
  tzOffsetMinutes: number,
  primaryChart?: BaziChart,
  secondChart?: BaziChart,
): DatePickerResult {
  const purpose = getPurposeById(purposeId);
  const allEvaluated: RankedDayItem[] = [];

  for (let i = 0; i < rangeDays; i++) {
    const inst = startInstant + i * 86_400_000;
    const almanac = computeDayAlmanac(inst, tzOffsetMinutes, primaryChart);
    const dateISO = formatDateISOFromJdn(almanac.jdn);
    const dp = almanac.dayPillar;
    const dayPillarVi = `${ganzhiData.stems[dp.stem].vi} ${ganzhiData.branches[dp.branch].vi}`;
    const lunarVi = `${almanac.lunar.day}/${almanac.lunar.month}${almanac.lunar.isLeapMonth ? ' (nhuận)' : ''} âm`;

    let score = 50;
    const reasons: string[] = [];
    const avoidReasons: string[] = [];

    // Hoàng đạo / Hắc đạo
    if (almanac.isHoangDaoDay) {
      score += 12;
      reasons.push(`Ngày Hoàng đạo (${almanac.hoangDaoDeity.vi})`);
    } else {
      score -= 8;
    }

    // Trực
    if (purpose.preferredTruc.includes(almanac.truc.id)) {
      score += 15;
      reasons.push(`Trực ${almanac.truc.vi} hợp mục đích`);
    } else if (purpose.avoidTruc.includes(almanac.truc.id)) {
      score -= 22;
      avoidReasons.push(`Trực ${almanac.truc.vi} kỵ ${purpose.vi.toLowerCase()}`);
    }

    // 28 Tú
    if (almanac.tu28.nen.includes(purpose.id)) {
      score += 7;
      reasons.push(`Sao ${almanac.tu28.vi} (Nhị thập bát tú) cát`);
    } else if (almanac.tu28.ky.includes(purpose.id)) {
      score -= 9;
      avoidReasons.push(`Sao ${almanac.tu28.vi} không thuận việc này`);
    }

    // Thần sát
    for (const ts of almanac.thanSat) {
      if (purpose.preferredThanSat.includes(ts.id)) {
        score += 9;
        reasons.push(`Có cát tinh ${ts.vi}`);
      }
      if (purpose.avoidThanSat.includes(ts.id)) {
        score -= 18;
        avoidReasons.push(`Phạm sao ${ts.vi}`);
      }
    }

    // Cá nhân hóa (1 hoặc 2 hồ sơ)
    if (primaryChart) {
      score += evaluatePersonalFit(
        almanac,
        primaryChart,
        purpose,
        secondChart ? 'Hồ sơ 1' : 'bản mệnh',
        reasons,
        avoidReasons,
      );
    }
    if (secondChart && purpose.allowSecondProfile) {
      score += evaluatePersonalFit(
        almanac,
        secondChart,
        purpose,
        'Hồ sơ 2',
        reasons,
        avoidReasons,
      );
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    const top3Hours = [...almanac.hours]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    allEvaluated.push({
      dateISO,
      jdn: almanac.jdn,
      almanac,
      dayPillarVi,
      lunarVi,
      score,
      reasons,
      avoidReasons,
      top3Hours,
    });
  }

  const topDays = [...allEvaluated]
    .filter((d) => d.avoidReasons.length === 0 || d.score >= 60)
    .sort((a, b) => b.score - a.score || a.jdn - b.jdn)
    .slice(0, 5);

  const avoidDays = [...allEvaluated]
    .filter((d) => d.avoidReasons.length > 0 && d.score < 50)
    .sort((a, b) => a.score - b.score || a.jdn - b.jdn)
    .slice(0, 10);

  return {
    purpose,
    rangeDays,
    topDays,
    avoidDays,
    allEvaluated,
  };
}
