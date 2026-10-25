import menhQuaiData from '../../data/menh-quai.json';
import { BaguaDir } from '../types';
import { BaguaTrigram, getTrigramById, TrigramId } from './bagua';

export type Gender = 'nam' | 'nu' | 'khong_neu';
export type MenhQuaiStarId =
  | 'sinh_khi'
  | 'thien_y'
  | 'dien_nien'
  | 'phuc_vi'
  | 'hoa_hai'
  | 'luc_sat'
  | 'ngu_quy'
  | 'tuyet_menh';

export interface MenhQuaiDirectionEntry {
  direction: BaguaDir;
  starId: MenhQuaiStarId;
  starVi: string;
  starHan: string;
  auspicious: boolean;
  rank: number;
  meaning: string;
}

export interface SingleMenhQuai {
  forGender: 'nam' | 'nu';
  kuaNumber: number; // 1,2,3,4,6,7,8,9 (5 quy về 2 cho nam, 8 cho nữ)
  rawNumber: number;
  trigram: BaguaTrigram;
  group: 'dong_tu_menh' | 'tay_tu_menh';
  groupVi: string;
  goodDirections: MenhQuaiDirectionEntry[];
  badDirections: MenhQuaiDirectionEntry[];
  byDirection: Record<BaguaDir, MenhQuaiDirectionEntry>;
}

export interface MenhQuaiResult {
  primary: SingleMenhQuai;
  /** Có mặt khi `gender === 'khong_neu'` để hiển thị cả hai (mục 5 & D7). */
  secondary?: SingleMenhQuai;
  note?: string;
}

function digitalRoot(n: number): number {
  let s = Math.abs(n);
  while (s >= 10) {
    let acc = 0;
    while (s > 0) {
      acc += s % 10;
      s = Math.floor(s / 10);
    }
    s = acc;
  }
  return s;
}

/**
 * Tính số Quái (Kua) từ năm Tứ trụ (sau Lập Xuân) và giới tính.
 * Quy tắc truyền thống:
 * - Trước 2000: Nam = 10 - root(2 chữ số cuối), Nữ = root(2 chữ số cuối + 5)
 * - Từ 2000: Nam = 9 - root(2 chữ số cuối) (nếu <=0 cộng 9), Nữ = root(2 chữ số cuối + 6)
 * - Trung cung (5): Nam quy về Khôn (2), Nữ quy về Cấn (8).
 */
export function computeKuaForGender(baziYear: number, g: 'nam' | 'nu'): SingleMenhQuai {
  const last2 = ((baziYear % 100) + 100) % 100;
  const r = digitalRoot(last2);
  let raw: number;
  if (baziYear < 2000) {
    raw = g === 'nam' ? 10 - r : digitalRoot(r + 5);
  } else {
    raw = g === 'nam' ? 9 - r : digitalRoot(r + 6);
  }
  while (raw <= 0) raw += 9;
  raw = digitalRoot(raw);
  const kuaNumber = raw === 5 ? (g === 'nam' ? 2 : 8) : raw;

  const entry = (menhQuaiData.kuaMap as Record<string, {
    trigram: TrigramId;
    group: 'dong_tu_menh' | 'tay_tu_menh';
    directions: Record<BaguaDir, MenhQuaiStarId>;
  }>)[String(kuaNumber)];

  const starsMeta = menhQuaiData.stars as Record<MenhQuaiStarId, {
    id: MenhQuaiStarId;
    vi: string;
    han: string;
    auspicious: boolean;
    rank: number;
    meaning: string;
  }>;

  const allEntries: MenhQuaiDirectionEntry[] = (Object.entries(entry.directions) as [BaguaDir, MenhQuaiStarId][]).map(
    ([direction, starId]) => {
      const sm = starsMeta[starId];
      return {
        direction,
        starId,
        starVi: sm.vi,
        starHan: sm.han,
        auspicious: sm.auspicious,
        rank: sm.rank,
        meaning: sm.meaning,
      };
    },
  );

  allEntries.sort((a, b) => a.rank - b.rank);
  const byDirection = {} as Record<BaguaDir, MenhQuaiDirectionEntry>;
  for (const e of allEntries) byDirection[e.direction] = e;

  return {
    forGender: g,
    kuaNumber,
    rawNumber: raw,
    trigram: getTrigramById(entry.trigram),
    group: entry.group,
    groupVi: entry.group === 'dong_tu_menh' ? 'Đông tứ mệnh' : 'Tây tứ mệnh',
    goodDirections: allEntries.filter((x) => x.auspicious),
    badDirections: allEntries.filter((x) => !x.auspicious),
    byDirection,
  };
}

export function computeMenhQuai(baziYear: number, gender: Gender): MenhQuaiResult {
  if (gender === 'nam' || gender === 'nu') {
    return { primary: computeKuaForGender(baziYear, gender) };
  }
  return {
    primary: computeKuaForGender(baziYear, 'nam'),
    secondary: computeKuaForGender(baziYear, 'nu'),
    note: 'Chưa nêu giới tính: hiển thị cả cách tính Nam (chính) và Nữ (phụ).',
  };
}
