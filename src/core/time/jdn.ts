/**
 * Số ngày Julian (JDN, tại 12h trưa) <-> ngày dương lịch Gregorian (proleptic).
 * Hàm thuần, chỉ dùng số nguyên.
 */
export function jdnFromYMD(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

export interface YMD {
  year: number;
  month: number;
  day: number;
}

export function ymdFromJdn(jdn: number): YMD {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

/** JDN của 1970-01-01 (Unix epoch). */
export const JDN_UNIX_EPOCH = 2440588;

/** Thứ trong tuần từ JDN: 0 = Chủ nhật ... 6 = Thứ bảy. */
export function weekdayFromJdn(jdn: number): number {
  return (((jdn + 1) % 7) + 7) % 7;
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
