import { mod } from '../time/jdn';

/** Quy ước giờ Tý (mục 3.1). */
export type ZiHourConvention = 'day_changes_at_23' | 'day_changes_at_00';
export const DEFAULT_ZI_CONVENTION: ZiHourConvention = 'day_changes_at_23';

/** Chi giờ (0..11) từ giờ địa phương 0..23: 23h-1h = Tý (0). */
export function hourBranchFromHour(hour: number): number {
  return Math.floor(mod(hour + 1, 24) / 2);
}

/** Can của giờ Tý theo "Ngũ Thử độn" từ Can ngày. */
export function ziHourStem(dayStem: number): number {
  return (mod(dayStem, 5) * 2) % 10;
}

/** Can giờ = Can giờ Tý + chỉ số Chi giờ. */
export function hourStemFor(dayStem: number, hourBranch: number): number {
  return (ziHourStem(dayStem) + hourBranch) % 10;
}

/**
 * Cho giờ địa phương và Can ngày DÂN SỰ (theo 0h), trả về Can ngày dùng cho giờ + cờ "qua ngày".
 * - day_changes_at_23: từ 23h trở đi Can Chi ngày là của ngày kế tiếp.
 * - day_changes_at_00: Can Chi ngày giữ nguyên cả giờ Tý muộn.
 */
export function dayShiftForHour(hour: number, convention: ZiHourConvention): 0 | 1 {
  return convention === 'day_changes_at_23' && hour >= 23 ? 1 : 0;
}
