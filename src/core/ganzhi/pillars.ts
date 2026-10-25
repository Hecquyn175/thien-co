import { mod } from '../time/jdn';
import { getSolarTerms, currentSolarTerm } from '../time/solar-terms';
import { localJdn, toLocalParts } from '../time/tz';
import {
  DEFAULT_ZI_CONVENTION,
  dayShiftForHour,
  hourBranchFromHour,
  hourStemFor,
  type ZiHourConvention,
} from './hour-pillar';

/** Một trụ: Can 0..9, Chi 0..11. */
export interface Pillar {
  stem: number;
  branch: number;
}

/** Chu kỳ 60 (0 = Giáp Tý) của một trụ, hoặc -1 nếu Can-Chi lệch âm dương. */
export function pillarToSexagenary(p: Pillar): number {
  for (let i = p.stem; i < 60; i += 10) if (i % 12 === p.branch) return i;
  return -1;
}

export function sexagenaryToPillar(n: number): Pillar {
  const k = mod(n, 60);
  return { stem: k % 10, branch: k % 12 };
}

/** Trụ ngày từ JDN (12h trưa): Can = (JDN+9) mod 10, Chi = (JDN+1) mod 12. */
export function dayPillarFromJdn(jdn: number): Pillar {
  return { stem: mod(jdn + 9, 10), branch: mod(jdn + 1, 12) };
}

/** Trụ năm từ năm Tứ trụ (đã điều chỉnh Lập Xuân): Can = (năm+6) mod 10, Chi = (năm+8) mod 12. */
export function yearPillarFromYear(year: number): Pillar {
  return { stem: mod(year + 6, 10), branch: mod(year + 8, 12) };
}

/** Can của tháng Dần theo "Ngũ Hổ độn" từ Can năm. */
export function danMonthStem(yearStem: number): number {
  return ((yearStem % 5) * 2 + 2) % 10;
}

/** Trụ tháng từ Chi tháng (0..11) và Can năm Tứ trụ. */
export function monthPillarFrom(yearStem: number, monthBranch: number): Pillar {
  const offsetFromDan = mod(monthBranch - 2, 12);
  return { stem: (danMonthStem(yearStem) + offsetFromDan) % 10, branch: monthBranch };
}

/** Năm Tứ trụ (đổi tại Lập Xuân, theo thời điểm vật lý) của `instant`. */
export function baziYearOf(instant: number, tzOffsetMinutes: number): number {
  const y = toLocalParts(instant, tzOffsetMinutes).year;
  const lapXuan = getSolarTerms(y)[2].instant;
  return instant < lapXuan ? y - 1 : y;
}

/** Chi tháng (0..11) theo tiết (jie) mới nhất đã qua tại `instant`. */
export function monthBranchOf(instant: number): { branch: number; jieIndex: number } {
  const { term } = currentSolarTerm(instant);
  // tiết (jie) gần nhất: nếu term là khí (index lẻ) thì lùi một
  const jieIndex = term.index % 2 === 0 ? term.index : term.index - 1;
  return { branch: (jieIndex / 2 + 1) % 12, jieIndex };
}

export interface FourPillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
  /** Năm Tứ trụ (số năm dương lịch sau điều chỉnh Lập Xuân) */
  baziYear: number;
}

export interface PillarOptions {
  tzOffsetMinutes: number;
  ziHourConvention?: ZiHourConvention;
}

/** Trụ ngày của `instant` (ngày dân sự theo 0h, chưa xét giờ Tý). */
export function civilDayPillar(instant: number, tzOffsetMinutes: number): Pillar {
  return dayPillarFromJdn(localJdn(instant, tzOffsetMinutes));
}

/** Tứ trụ của một instant. */
export function fourPillars(instant: number, opts: PillarOptions): FourPillars {
  const conv = opts.ziHourConvention ?? DEFAULT_ZI_CONVENTION;
  const parts = toLocalParts(instant, opts.tzOffsetMinutes);
  const baziYear = baziYearOf(instant, opts.tzOffsetMinutes);
  const year = yearPillarFromYear(baziYear);
  const { branch: mBranch } = monthBranchOf(instant);
  const month = monthPillarFrom(year.stem, mBranch);
  const shift = dayShiftForHour(parts.hour, conv);
  const day = dayPillarFromJdn(localJdn(instant, opts.tzOffsetMinutes) + shift);
  const hb = hourBranchFromHour(parts.hour);
  const hour: Pillar = { stem: hourStemFor(day.stem, hb), branch: hb };
  return { year, month, day, hour, baziYear };
}
