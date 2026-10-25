import trucData from '../../data/truc.json';
import { mod } from '../time/jdn';
import { ConfidenceLevel } from '../types';

export type TrucId =
  | 'kien'
  | 'tru'
  | 'man'
  | 'binh'
  | 'dinh'
  | 'chap'
  | 'pha'
  | 'nguy'
  | 'thanh'
  | 'thu'
  | 'khai'
  | 'be';

export interface TrucInfo {
  id: TrucId;
  index: number;
  vi: string;
  han: string;
  rating: 'cat' | 'binh' | 'hung';
  summary: string;
  nen: string[];
  ky: string[];
  source: string;
  confidence: ConfidenceLevel;
}

export const TRUC_LIST: ReadonlyArray<TrucInfo> = (trucData.items as Omit<TrucInfo, 'index'>[]).map(
  (item, index) => ({ ...item, index }),
);

/**
 * Tính Trực của ngày dựa trên Chi tháng (theo tiết khí, Dần=2) và Chi ngày.
 * Quy tắc: tháng nào lấy ngày trùng Chi tháng làm Trực Kiến (index 0).
 */
export function getTrucForDay(monthBranch: number, dayBranch: number): TrucInfo {
  const idx = mod(dayBranch - monthBranch, 12);
  return TRUC_LIST[idx];
}
