import hexData from '../../data/hexagrams.json';
import { TrigramId } from '../directions/bagua';
import { ConfidenceLevel, EventGroup } from '../types';

export interface HexagramMeaningByGroup {
  nguoi: string;
  tien_bac: string;
  cong_viec: string;
  suc_khoe_di_chuyen: string;
}

export interface HexagramInfo {
  number: number; // 1..64
  han: string;
  vi: string;
  upper: TrigramId;
  lower: TrigramId;
  /** 6 ký tự '0'/'1' từ hào 1 (dưới cùng) lên hào 6 (trên cùng) */
  lines: string;
  nature: 'cat' | 'binh' | 'hung';
  judgement: string;
  meaning: Record<EventGroup, string>;
  confidence: ConfidenceLevel;
  source: string;
}

export const HEXAGRAMS: ReadonlyArray<HexagramInfo> =
  hexData.hexagrams as unknown as HexagramInfo[];

const BY_LINES = new Map<string, HexagramInfo>(HEXAGRAMS.map((h) => [h.lines, h]));
const BY_NUMBER = new Map<number, HexagramInfo>(HEXAGRAMS.map((h) => [h.number, h]));

export function getHexagramByLines(lines: string): HexagramInfo {
  const h = BY_LINES.get(lines);
  if (!h) throw new Error(`Không tìm thấy quẻ ứng với 6 hào: ${lines}`);
  return h;
}

export function getHexagramByNumber(num: number): HexagramInfo {
  const h = BY_NUMBER.get(num);
  if (!h) throw new Error(`Không tìm thấy quẻ số: ${num}`);
  return h;
}

/**
 * Quẻ Hỗ (Mutual hexagram):
 * - Hạ quái mới = hào 2, 3, 4 (chỉ số 1, 2, 3 trong chuỗi 0..5)
 * - Thượng quái mới = hào 3, 4, 5 (chỉ số 2, 3, 4)
 */
export function computeMutualHexagram(primary: HexagramInfo): HexagramInfo {
  const l = primary.lines;
  const mutualLines = l.slice(1, 4) + l.slice(2, 5);
  return getHexagramByLines(mutualLines);
}

/**
 * Quẻ Biến (Changed hexagram) khi đảo các hào động (1..6, 1 là hào dưới cùng).
 */
export function computeChangedHexagram(
  primary: HexagramInfo,
  movingLines: number[],
): HexagramInfo {
  if (movingLines.length === 0) return primary;
  const chars = primary.lines.split('');
  for (const m of movingLines) {
    const idx = m - 1;
    if (idx >= 0 && idx < 6) {
      chars[idx] = chars[idx] === '1' ? '0' : '1';
    }
  }
  return getHexagramByLines(chars.join(''));
}
