import hoangDaoData from '../../data/hoang-dao.json';
import { mod } from '../time/jdn';

export interface HoangDaoDeity {
  id: string;
  vi: string;
  han: string;
  hoangDao: boolean;
  summary: string;
}

export const HOANG_DAO_DEITIES: ReadonlyArray<HoangDaoDeity> =
  hoangDaoData.deities as HoangDaoDeity[];

const START_MAP = hoangDaoData.startBranchByHostBranch as Record<string, number>;

/**
 * Tính thần Hoàng đạo / Hắc đạo cho ngày (từ Chi tháng và Chi ngày)
 * hoặc cho canh giờ (từ Chi ngày và Chi giờ).
 * Quy tắc:
 * - Dần, Thân: Thanh Long khởi tại Tý (0)
 * - Mão, Dậu: khởi tại Dần (2)
 * - Thìn, Tuất: khởi tại Thìn (4)
 * - Tỵ, Hợi: khởi tại Ngọ (6)
 * - Tý, Ngọ: khởi tại Thân (8)
 * - Sửu, Mùi: khởi tại Tuất (10)
 */
export function getDeityForBranch(hostBranch: number, targetBranch: number): HoangDaoDeity {
  const startBranch = START_MAP[String(mod(hostBranch, 12))] ?? 0;
  const deityIdx = mod(targetBranch - startBranch, 12);
  return HOANG_DAO_DEITIES[deityIdx];
}

export function getDayHoangDao(monthBranch: number, dayBranch: number): HoangDaoDeity {
  return getDeityForBranch(monthBranch, dayBranch);
}

export function getHourHoangDao(dayBranch: number, hourBranch: number): HoangDaoDeity {
  return getDeityForBranch(dayBranch, hourBranch);
}
