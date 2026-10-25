import ganzhi from '../../data/ganzhi.json';
import { norm180, sunApparentLongitudeUT } from './astro';
import { instantFromJd, jdFromInstant } from './tz';

export interface SolarTermDef {
  id: string;
  vi: string;
  han: string;
  /** kinh độ Mặt Trời (độ) */
  longitude: number;
  /** true = "tiết" (đầu tháng Can Chi), false = "khí" (trung khí) */
  jie: boolean;
}

export interface SolarTermInstant {
  /** 0 = Tiểu Hàn ... 23 = Đông Chí (thứ tự trong năm dương lịch) */
  index: number;
  def: SolarTermDef;
  /** epoch ms UTC */
  instant: number;
}

export const SOLAR_TERM_DEFS: ReadonlyArray<SolarTermDef> = ganzhi.solarTerms as SolarTermDef[];

/** JD gần đúng của Xuân Phân (kinh độ 0°) của năm `year`. */
function approxEquinoxJd(year: number): number {
  return 2451623.8 + (year - 2000) * 365.2422;
}

/** JD (UT) mà kinh độ biểu kiến Mặt Trời bằng `target` độ, gần `guessJd`. */
export function solveSunLongitudeJd(target: number, guessJd: number): number {
  let jd = guessJd;
  for (let i = 0; i < 12; i++) {
    const diff = norm180(sunApparentLongitudeUT(jd) - target);
    jd -= diff / 0.9856;
    if (Math.abs(diff) < 1e-9) break;
  }
  return jd;
}

const termCache = new Map<number, SolarTermInstant[]>();

/** 24 tiết khí của năm dương lịch `year` (thời điểm chính xác, epoch ms UTC), sắp theo thời gian. */
export function getSolarTerms(year: number): SolarTermInstant[] {
  const cached = termCache.get(year);
  if (cached) return cached;
  const eq = approxEquinoxJd(year);
  const out: SolarTermInstant[] = SOLAR_TERM_DEFS.map((def, index) => {
    const offsetDeg = def.longitude >= 285 ? def.longitude - 360 : def.longitude;
    const guess = eq + (offsetDeg / 360) * 365.2422;
    const jd = solveSunLongitudeJd(def.longitude, guess);
    return { index, def, instant: instantFromJd(jd) };
  });
  termCache.set(year, out);
  return out;
}

export interface CurrentTerm {
  year: number;
  term: SolarTermInstant;
  next: SolarTermInstant;
}

function utcYear(instant: number): number {
  return new Date(instant).getUTCFullYear();
}

/** Tiết khí hiện hành (mới nhất có thời điểm <= instant) và tiết khí kế tiếp. */
export function currentSolarTerm(instant: number): CurrentTerm {
  const y = utcYear(instant);
  const all = [...getSolarTerms(y - 1), ...getSolarTerms(y), ...getSolarTerms(y + 1)];
  let idx = -1;
  for (let i = 0; i < all.length; i++) {
    if (all[i].instant <= instant) idx = i;
    else break;
  }
  const term = all[idx];
  const next = all[idx + 1];
  // năm dương lịch của tiết (từ chỉ số mảng)
  const termYear = y - 1 + Math.floor(idx / 24);
  return { year: termYear, term, next };
}

/** Thời điểm Lập Xuân của năm dương lịch `year`. */
export function lapXuanInstant(year: number): number {
  return getSolarTerms(year)[2].instant;
}

/** Chuyển JD (UT) <-> instant để test. */
export const _jd = { jdFromInstant, instantFromJd };
