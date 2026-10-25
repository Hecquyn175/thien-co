import flyingData from '../../data/flying-stars.json';
import { baziYearOf, civilDayPillar, monthBranchOf, pillarToSexagenary } from '../ganzhi/pillars';
import { hourBranchFromHour } from '../ganzhi/hour-pillar';
import { mod } from '../time/jdn';
import { getSolarTerms } from '../time/solar-terms';
import { localJdn, toLocalParts } from '../time/tz';
import { BaguaDir, ConfidenceLevel, ElementId } from '../types';

export interface FlyingStarMeta {
  number: number; // 1..9
  vi: string;
  shortVi: string;
  han: string;
  element: ElementId;
  nature: 'cat' | 'hung';
  tags: string[];
  summary: string;
}

export const FLYING_STARS_META: ReadonlyArray<FlyingStarMeta> =
  flyingData.stars as FlyingStarMeta[];

export function getFlyingStarMeta(num: number): FlyingStarMeta {
  const n = mod(num - 1, 9) + 1;
  return FLYING_STARS_META[n - 1];
}

export interface FlyingStarBoard {
  centerStar: number;
  centerMeta: FlyingStarMeta;
  duongDon: boolean;
  byDirection: Record<BaguaDir, FlyingStarMeta>;
  confidence: ConfidenceLevel;
}

/**
 * Từ sao nhập Trung cung (1..9) và chiều bay (Dương độn +1 / Âm độn -1),
 * trả về sao ở 8 hướng theo đường bay Lạc Thư.
 * Lạc Thư nguyên bàn (5 ở Trung cung):
 * 6 = Tây Bắc, 7 = Tây, 8 = Đông Bắc, 9 = Nam, 1 = Bắc, 2 = Tây Nam, 3 = Đông, 4 = Đông Nam.
 */
const LOSHU_STEP_TO_DIR: ReadonlyArray<BaguaDir> = [
  'tay_bac', // bước 1 (tương ứng cung 6)
  'tay', // bước 2 (cung 7)
  'dong_bac', // bước 3 (cung 8)
  'nam', // bước 4 (cung 9)
  'bac', // bước 5 (cung 1)
  'tay_nam', // bước 6 (cung 2)
  'dong', // bước 7 (cung 3)
  'dong_nam', // bước 8 (cung 4)
];

export function buildFlyingStarBoard(centerStar: number, duongDon = true): FlyingStarBoard {
  const center = mod(centerStar - 1, 9) + 1;
  const stepSign = duongDon ? 1 : -1;
  const byDirection = {} as Record<BaguaDir, FlyingStarMeta>;

  for (let i = 0; i < LOSHU_STEP_TO_DIR.length; i++) {
    const dir = LOSHU_STEP_TO_DIR[i];
    const starNum = mod(center - 1 + stepSign * (i + 1), 9) + 1;
    byDirection[dir] = getFlyingStarMeta(starNum);
  }

  return {
    centerStar: center,
    centerMeta: getFlyingStarMeta(center),
    duongDon,
    byDirection,
    confidence: 'B',
  };
}

/** Sao Trung cung của Năm (theo năm Tứ trụ): năm 2026 là Nhất Bạch (1). Công thức: ((2027 - year) mod 9) || 9. */
export function getYearCenterStar(baziYear: number): number {
  return mod(2026 - baziYear, 9) + 1;
}

/**
 * Sao Trung cung của Tháng (theo Chi năm và số thứ tự tháng Tứ trụ: Dần=1..Sửu=12):
 * - Tý, Ngọ, Mão, Dậu: tháng Dần khởi Bát Bạch (8)
 * - Thìn, Tuất, Sửu, Mùi: tháng Dần khởi Ngũ Hoàng (5)
 * - Dần, Thân, Tỵ, Hợi: tháng Dần khởi Nhị Hắc (2)
 */
export function getMonthCenterStar(yearBranch: number, monthBranch: number): number {
  const monthIdxFromDan = mod(monthBranch - 2, 12); // 0..11
  const group = yearBranch % 3; // 0 = Tý Ngọ Mão Dậu (8), 1 = Sửu Mùi Thìn Tuất (5), 2 = Dần Thân Tỵ Hợi (2)
  const startStar = group === 0 ? 8 : group === 1 ? 5 : 2;
  return mod(startStar - 1 - monthIdxFromDan, 9) + 1;
}

/**
 * Sao Trung cung của Ngày:
 * - Từ Đông Chí đến trước Hạ Chí: Dương độn (thuận), Giáp Tý gần Đông Chí khởi Nhất Bạch (1) (Sách Bổ đơn giản hóa theo tiết khí).
 * - Từ Hạ Chí đến trước Đông Chí: Âm độn (nghịch), Giáp Tý khởi Cửu Tử (9).
 */
export function getDayFlyingStarInfo(
  instant: number,
  tzOffsetMinutes: number,
): { centerStar: number; duongDon: boolean } {
  const parts = toLocalParts(instant, tzOffsetMinutes);
  const terms = getSolarTerms(parts.year);
  const haChi = terms[11].instant; // Hạ Chí
  const dongChi = terms[23].instant; // Đông Chí
  const duongDon = instant < haChi || instant >= dongChi;

  const dayPillar = civilDayPillar(instant, tzOffsetMinutes);
  const sex = pillarToSexagenary(dayPillar);
  const jdn = localJdn(instant, tzOffsetMinutes);

  // Phân tam nguyên theo khoảng cách tới tiết gần nhất: Thượng (1/9), Trung (7/3), Hạ (4/6)
  const yuan = Math.floor(mod(jdn, 180) / 60); // 0, 1, 2
  if (duongDon) {
    const start = yuan === 0 ? 1 : yuan === 1 ? 7 : 4;
    return { centerStar: mod(start - 1 + sex, 9) + 1, duongDon: true };
  }
  const start = yuan === 0 ? 9 : yuan === 1 ? 3 : 6;
  return { centerStar: mod(start - 1 - sex, 9) + 1, duongDon: false };
}

/**
 * Sao Trung cung của Giờ:
 * - Dương độn (Đông Chí → Hạ Chí): Tý Ngọ Mão Dậu giờ Tý khởi 1, Thìn Tuất Sửu Mùi khởi 4, Dần Thân Tỵ Hợi khởi 7 (bay thuận).
 * - Âm độn (Hạ Chí → Đông Chí): Tý Ngọ Mão Dậu giờ Tý khởi 9, Thìn Tuất Sửu Mùi khởi 6, Dần Thân Tỵ Hợi khởi 3 (bay nghịch).
 */
export function getHourCenterStar(
  dayBranch: number,
  hourBranch: number,
  duongDon: boolean,
): number {
  const group = dayBranch % 3;
  if (duongDon) {
    const start = group === 0 ? 1 : group === 1 ? 4 : 7;
    return mod(start - 1 + hourBranch, 9) + 1;
  }
  const start = group === 0 ? 9 : group === 1 ? 6 : 3;
  return mod(start - 1 - hourBranch, 9) + 1;
}

export interface FullFlyingStarsSnapshot {
  year: FlyingStarBoard;
  month: FlyingStarBoard;
  day: FlyingStarBoard;
  hour: FlyingStarBoard;
}

export function computeFlyingStars(
  instant: number,
  tzOffsetMinutes: number,
): FullFlyingStarsSnapshot {
  const baziYear = baziYearOf(instant, tzOffsetMinutes);
  const yearBranch = mod(baziYear + 8, 12);
  const { branch: monthBranch } = monthBranchOf(instant);
  const dayPillar = civilDayPillar(instant, tzOffsetMinutes);
  const parts = toLocalParts(instant, tzOffsetMinutes);
  const hb = hourBranchFromHour(parts.hour);

  const yearCenter = getYearCenterStar(baziYear);
  const monthCenter = getMonthCenterStar(yearBranch, monthBranch);
  const dayInfo = getDayFlyingStarInfo(instant, tzOffsetMinutes);
  const hourCenter = getHourCenterStar(dayPillar.branch, hb, dayInfo.duongDon);

  return {
    year: buildFlyingStarBoard(yearCenter, true),
    month: buildFlyingStarBoard(monthCenter, true),
    day: buildFlyingStarBoard(dayInfo.centerStar, dayInfo.duongDon),
    hour: buildFlyingStarBoard(hourCenter, dayInfo.duongDon),
  };
}
