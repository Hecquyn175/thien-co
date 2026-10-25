import { hourBranchFromHour } from '../ganzhi/hour-pillar';
import { baziYearOf } from '../ganzhi/pillars';
import { createSeededRng } from '../rng';
import { mod } from '../time/jdn';
import { instantToLunar } from '../time/lunar-vn';
import { localJdn, toLocalParts } from '../time/tz';
import {
  computeChangedHexagram,
  computeMutualHexagram,
  getHexagramByLines,
  getHexagramByNumber,
  HexagramInfo,
} from './hexagrams';

export type CastMethod = 'mai_hoa_time' | 'three_coins' | 'daily_hexagram';

/** Giá trị 1 lần gieo 3 đồng xu: 6 (lão âm động), 7 (thiếu dương tĩnh), 8 (thiếu âm tĩnh), 9 (lão dương động) */
export type CoinLineValue = 6 | 7 | 8 | 9;

export interface IChingCastResult {
  method: CastMethod;
  seedInfo: string;
  question?: string;
  primary: HexagramInfo;
  mutual: HexagramInfo;
  changed: HexagramInfo;
  /** Các hào động (1..6, 1 = hào sơ dưới cùng) */
  movingLines: number[];
  /** Kết quả 6 lần gieo xu (nếu method === 'three_coins') */
  coinValues?: [CoinLineValue, CoinLineValue, CoinLineValue, CoinLineValue, CoinLineValue, CoinLineValue];
}

/** Thứ tự Tiên thiên Bát quái dùng trong Mai Hoa Dịch Số: 1 Càn, 2 Đoài, 3 Ly, 4 Chấn, 5 Tốn, 6 Khảm, 7 Cấn, 8 Khôn */
const XIAN_TIAN_LINES: ReadonlyArray<string> = [
  '111', // 1 Càn
  '110', // 2 Đoài
  '101', // 3 Ly
  '100', // 4 Chấn
  '011', // 5 Tốn
  '010', // 6 Khảm
  '001', // 7 Cấn
  '000', // 8 Khôn
];

/**
 * (a) Mai Hoa theo thời gian:
 * - Năm Chi (1..12: Tý=1..Hợi=12), tháng âm (1..12), ngày âm (1..30), giờ Chi (1..12).
 * - Thượng quái = (Năm + Tháng + Ngày) mod 8 (0 -> 8)
 * - Hạ quái = (Năm + Tháng + Ngày + Giờ) mod 8 (0 -> 8)
 * - Hào động = (Năm + Tháng + Ngày + Giờ) mod 6 (0 -> 6)
 */
export function castMaiHoaByTime(
  instant: number,
  tzOffsetMinutes: number,
  question?: string,
): IChingCastResult {
  const lunar = instantToLunar(instant, tzOffsetMinutes);
  const baziYear = baziYearOf(instant, tzOffsetMinutes);
  const yearBranchNum = mod(baziYear + 8, 12) + 1; // 1..12
  const parts = toLocalParts(instant, tzOffsetMinutes);
  const hourBranchNum = hourBranchFromHour(parts.hour) + 1; // 1..12

  const sumUpper = yearBranchNum + lunar.month + lunar.day;
  const sumTotal = sumUpper + hourBranchNum;

  const upperIdx = mod(sumUpper - 1, 8); // 0..7
  const lowerIdx = mod(sumTotal - 1, 8); // 0..7
  const movingLine = mod(sumTotal - 1, 6) + 1; // 1..6

  const lines = XIAN_TIAN_LINES[lowerIdx] + XIAN_TIAN_LINES[upperIdx];
  const primary = getHexagramByLines(lines);
  const mutual = computeMutualHexagram(primary);
  const changed = computeChangedHexagram(primary, [movingLine]);

  return {
    method: 'mai_hoa_time',
    seedInfo: `lunar:${lunar.year}-${lunar.month}-${lunar.day}:h${hourBranchNum}`,
    question,
    primary,
    mutual,
    changed,
    movingLines: [movingLine],
  };
}

/**
 * (b) Gieo 3 đồng xu 6 lần với PRNG có seed = hash(timestamp + question).
 * Mỗi đồng xu: ngửa = 3, sấp = 2; tổng 3 đồng ∈ {6, 7, 8, 9}.
 * - 6: lão âm (hào âm '0', động)
 * - 7: thiếu dương (hào dương '1', tĩnh)
 * - 8: thiếu âm (hào âm '0', tĩnh)
 * - 9: lão dương (hào dương '1', động)
 */
export function castThreeCoins(timestamp: number, question = ''): IChingCastResult {
  const seedStr = `coins:${timestamp}:${question.trim()}`;
  const rng = createSeededRng(seedStr);
  const coinValues: CoinLineValue[] = [];
  const movingLines: number[] = [];
  let lines = '';

  for (let lineNum = 1; lineNum <= 6; lineNum++) {
    let sum = 0;
    for (let c = 0; c < 3; c++) {
      sum += rng() < 0.5 ? 2 : 3;
    }
    const v = sum as CoinLineValue;
    coinValues.push(v);
    const isYang = v === 7 || v === 9;
    lines += isYang ? '1' : '0';
    if (v === 6 || v === 9) {
      movingLines.push(lineNum);
    }
  }

  const primary = getHexagramByLines(lines);
  const mutual = computeMutualHexagram(primary);
  const changed = computeChangedHexagram(primary, movingLines);

  return {
    method: 'three_coins',
    seedInfo: seedStr,
    question,
    primary,
    mutual,
    changed,
    movingLines,
    coinValues: coinValues as [
      CoinLineValue,
      CoinLineValue,
      CoinLineValue,
      CoinLineValue,
      CoinLineValue,
      CoinLineValue,
    ],
  };
}

/**
 * (c) Quẻ của ngày (deterministic theo ngày JDN + profileId).
 */
export function getDailyHexagram(
  instant: number,
  tzOffsetMinutes: number,
  profileId = 'no_profile',
): IChingCastResult {
  const jdn = localJdn(instant, tzOffsetMinutes);
  const seedStr = `daily:${jdn}:${profileId}`;
  const rng = createSeededRng(seedStr);
  const num = Math.floor(rng() * 64) + 1;
  const movingLine = Math.floor(rng() * 6) + 1;
  const primary = getHexagramByNumber(num);
  const mutual = computeMutualHexagram(primary);
  const changed = computeChangedHexagram(primary, [movingLine]);

  return {
    method: 'daily_hexagram',
    seedInfo: seedStr,
    primary,
    mutual,
    changed,
    movingLines: [movingLine],
  };
}
