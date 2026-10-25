import { JDN_UNIX_EPOCH, jdnFromYMD, ymdFromJdn, weekdayFromJdn } from './jdn';

/** Múi giờ mặc định: Asia/Ho_Chi_Minh (UTC+7), tính bằng phút. */
export const DEFAULT_TZ_OFFSET_MINUTES = 420;

const MS_PER_MIN = 60_000;
const MS_PER_DAY = 86_400_000;

export interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Chủ nhật */
  weekday: number;
}

/** Tách `instant` (epoch ms UTC) thành giờ địa phương với offset tường minh (phút). */
export function toLocalParts(instant: number, tzOffsetMinutes: number): LocalParts {
  const local = instant + tzOffsetMinutes * MS_PER_MIN;
  const days = Math.floor(local / MS_PER_DAY);
  const msOfDay = local - days * MS_PER_DAY;
  const jdn = days + JDN_UNIX_EPOCH;
  const { year, month, day } = ymdFromJdn(jdn);
  const hour = Math.floor(msOfDay / 3_600_000);
  const minute = Math.floor((msOfDay % 3_600_000) / MS_PER_MIN);
  const second = Math.floor((msOfDay % MS_PER_MIN) / 1000);
  return { year, month, day, hour, minute, second, weekday: weekdayFromJdn(jdn) };
}

/** Ngược lại: giờ địa phương -> `instant` (epoch ms UTC). */
export function fromLocalParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  tzOffsetMinutes: number,
): number {
  const days = jdnFromYMD(year, month, day) - JDN_UNIX_EPOCH;
  return (
    days * MS_PER_DAY +
    hour * 3_600_000 +
    minute * MS_PER_MIN +
    second * 1000 -
    tzOffsetMinutes * MS_PER_MIN
  );
}

/** JDN của ngày dân sự địa phương chứa `instant`. */
export function localJdn(instant: number, tzOffsetMinutes: number): number {
  return Math.floor((instant + tzOffsetMinutes * MS_PER_MIN) / MS_PER_DAY) + JDN_UNIX_EPOCH;
}

/** Instant của 00:00 địa phương của ngày JDN. */
export function localMidnightInstant(jdn: number, tzOffsetMinutes: number): number {
  return (jdn - JDN_UNIX_EPOCH) * MS_PER_DAY - tzOffsetMinutes * MS_PER_MIN;
}

/** Phân tích "YYYY-MM-DDTHH:mm[:ss]" (giờ treo tường, không có hậu tố múi giờ). */
export function parseLocalDateTime(
  s: string,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s.trim());
  if (!m) throw new Error(`Chuỗi ngày giờ không hợp lệ: ${s}`);
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4] ?? 0),
    minute: Number(m[5] ?? 0),
    second: Number(m[6] ?? 0),
  };
}

/** Giờ treo tường + offset -> instant. */
export function instantFromLocalString(s: string, tzOffsetMinutes: number): number {
  const p = parseLocalDateTime(s);
  return fromLocalParts(p.year, p.month, p.day, p.hour, p.minute, p.second, tzOffsetMinutes);
}

export function jdFromInstant(instant: number): number {
  return instant / MS_PER_DAY + 2440587.5;
}

export function instantFromJd(jd: number): number {
  return Math.round((jd - 2440587.5) * MS_PER_DAY);
}
