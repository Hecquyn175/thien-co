import { newMoonJdUT, sunApparentLongitudeUT } from './astro';
import { jdnFromYMD, mod, ymdFromJdn } from './jdn';
import { DEFAULT_TZ_OFFSET_MINUTES, localJdn } from './tz';

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
}

export interface LunarMonthEntry {
  /** JDN ngày mùng 1 (theo múi giờ của bảng) */
  startJdn: number;
  length: number;
  year: number;
  month: number;
  leap: boolean;
}

/** Ngày dân sự (JDN) chứa Trăng mới thứ k theo múi giờ `tzMin`. */
function newMoonDay(k: number, tzMin: number): number {
  return Math.floor(newMoonJdUT(k) + 0.5 + tzMin / 1440);
}

/** Chỉ số trung khí = floor(kinh độ/30) tại 00:00 địa phương của ngày JDN. */
function majorTermIndex(jdn: number, tzMin: number): number {
  const jdUT = jdn - 0.5 - tzMin / 1440;
  return Math.floor(sunApparentLongitudeUT(jdUT) / 30);
}

const tableCache = new Map<number, LunarMonthEntry[]>();

/** Phạm vi bảng: từ ~tháng 10/1898 đến ~tháng 3/2102. */
const TABLE_FIRST_JDN = jdnFromYMD(1898, 10, 1);
const TABLE_LAST_JDN = jdnFromYMD(2102, 3, 1);

/**
 * Dựng bảng các tháng âm lịch (đã đặt tên tháng, nhuận) cho múi giờ `tzMin`.
 * Quy tắc: tháng chứa Đông Chí (270°) là tháng 11; năm có 13 tháng giữa hai tháng 11
 * thì tháng đầu tiên không có trung khí là tháng nhuận.
 */
export function getLunarTable(tzMin: number): LunarMonthEntry[] {
  const cached = tableCache.get(tzMin);
  if (cached) return cached;

  const kStart = Math.floor((TABLE_FIRST_JDN - 2451550.1) / 29.530588861) - 1;
  const kEnd = Math.ceil((TABLE_LAST_JDN - 2451550.1) / 29.530588861) + 1;
  const starts: number[] = [];
  for (let k = kStart; k <= kEnd; k++) starts.push(newMoonDay(k, tzMin));
  const idx = starts.map((s) => majorTermIndex(s, tzMin));

  const n = starts.length - 1; // số tháng đầy đủ
  const hasZhongqi = (i: number) => idx[i + 1] !== idx[i];
  // Tháng chứa Đông Chí (270° = ranh giới giữa chỉ số 8 và 9). Một tháng có thể vượt 2 ranh giới.
  const isM11 = (i: number) => {
    const delta = mod(idx[i + 1] - idx[i], 12);
    const toBoundary = mod(9 - idx[i], 12);
    return toBoundary >= 1 && toBoundary <= delta;
  };

  const m11: number[] = [];
  for (let i = 0; i < n; i++) if (isM11(i)) m11.push(i);

  const out: LunarMonthEntry[] = [];
  for (let a = 0; a + 1 < m11.length; a++) {
    const i0 = m11[a];
    const i1 = m11[a + 1];
    const count = i1 - i0;
    // năm dương lịch chứa Đông Chí của tháng 11 đầu
    const y0 = ymdFromJdn(starts[i0]).year;
    // Đông Chí rơi vào cuối năm dương lịch, nhưng ngày mùng 1 tháng 11 có thể đã sang năm?
    // Đông Chí ~ 21-22/12 nên mùng 1 tháng 11 luôn nằm trong cùng năm dương lịch (cuối T11 - T12).
    let leapIdx = -1;
    if (count === 13) {
      for (let j = i0 + 1; j < i1; j++) {
        if (!hasZhongqi(j)) {
          leapIdx = j;
          break;
        }
      }
    }
    let num = 11;
    let year = y0;
    for (let i = i0; i < i1; i++) {
      let leap = false;
      if (i === i0) {
        num = 11;
      } else if (i === leapIdx) {
        leap = true; // giữ nguyên số tháng của tháng trước
      } else {
        num = (num % 12) + 1;
        if (num === 1) year++;
      }
      out.push({
        startJdn: starts[i],
        length: starts[i + 1] - starts[i],
        year,
        month: num,
        leap,
      });
    }
  }
  tableCache.set(tzMin, out);
  return out;
}

function findMonthIndex(table: LunarMonthEntry[], jdn: number): number {
  let lo = 0;
  let hi = table.length - 1;
  if (jdn < table[0].startJdn || jdn >= table[hi].startJdn + table[hi].length) return -1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (table[mid].startJdn <= jdn) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Âm lịch theo múi giờ tùy chọn (mặc định Việt Nam UTC+7). */
export function jdnToLunar(jdn: number, tzMin = DEFAULT_TZ_OFFSET_MINUTES): LunarDate {
  const table = getLunarTable(tzMin);
  const i = findMonthIndex(table, jdn);
  if (i < 0) throw new RangeError('Ngày ngoài phạm vi 1900-2100 của âm lịch');
  const m = table[i];
  return { year: m.year, month: m.month, day: jdn - m.startJdn + 1, isLeapMonth: m.leap };
}

/** Dương -> âm lịch Việt Nam (UTC+7 mặc định). */
export function solarToLunarVN(
  year: number,
  month: number,
  day: number,
  tzMin = DEFAULT_TZ_OFFSET_MINUTES,
): LunarDate {
  return jdnToLunar(jdnFromYMD(year, month, day), tzMin);
}

/** Âm -> dương. Trả về null nếu không tồn tại (vd tháng nhuận không có, ngày 30 của tháng thiếu). */
export function lunarToSolarVN(
  year: number,
  month: number,
  day: number,
  isLeapMonth = false,
  tzMin = DEFAULT_TZ_OFFSET_MINUTES,
): { year: number; month: number; day: number } | null {
  const table = getLunarTable(tzMin);
  const m = table.find((e) => e.year === year && e.month === month && e.leap === isLeapMonth);
  if (!m || day < 1 || day > m.length) return null;
  return ymdFromJdn(m.startJdn + day - 1);
}

/** Âm lịch từ instant theo múi giờ tường minh. */
export function instantToLunar(instant: number, tzMin = DEFAULT_TZ_OFFSET_MINUTES): LunarDate {
  return jdnToLunar(localJdn(instant, tzMin), tzMin);
}

/** Số ngày của tháng âm lịch (29 hoặc 30). */
export function lunarMonthLength(
  year: number,
  month: number,
  isLeapMonth = false,
  tzMin = DEFAULT_TZ_OFFSET_MINUTES,
): number | null {
  const m = getLunarTable(tzMin).find(
    (e) => e.year === year && e.month === month && e.leap === isLeapMonth,
  );
  return m ? m.length : null;
}
