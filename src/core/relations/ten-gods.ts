import { TenGodId } from '../types';
import { getElementRelation, stemElement, stemIsYang } from './elements';

export interface TenGodMeta {
  id: TenGodId;
  vi: string;
  shortVi: string;
  han: string;
}

export const TEN_GOD_META: Record<TenGodId, TenGodMeta> = {
  ty_kien: { id: 'ty_kien', vi: 'Tỷ Kiên', shortVi: 'Tỷ', han: '比肩' },
  kiep_tai: { id: 'kiep_tai', vi: 'Kiếp Tài', shortVi: 'Kiếp', han: '劫財' },
  thuc_than: { id: 'thuc_than', vi: 'Thực Thần', shortVi: 'Thực', han: '食神' },
  thuong_quan: { id: 'thuong_quan', vi: 'Thương Quan', shortVi: 'Thương', han: '傷官' },
  thien_tai: { id: 'thien_tai', vi: 'Thiên Tài', shortVi: 'T.Tài', han: '偏財' },
  chinh_tai: { id: 'chinh_tai', vi: 'Chính Tài', shortVi: 'C.Tài', han: '正財' },
  that_sat: { id: 'that_sat', vi: 'Thất Sát', shortVi: 'Sát', han: '七殺' },
  chinh_quan: { id: 'chinh_quan', vi: 'Chính Quan', shortVi: 'Quan', han: '正官' },
  thien_an: { id: 'thien_an', vi: 'Thiên Ấn', shortVi: 'Kiêu', han: '偏印' },
  chinh_an: { id: 'chinh_an', vi: 'Chính Ấn', shortVi: 'Ấn', han: '正印' },
};

/**
 * Tính Thập thần của `targetStem` (0..9) so với Nhật chủ `dayMasterStem` (0..9).
 * Công thức mục 4:
 * - cùng hành cùng âm dương = Tỷ Kiên; khác = Kiếp Tài
 * - ta sinh cùng âm dương = Thực Thần; khác = Thương Quan
 * - ta khắc cùng âm dương = Thiên Tài; khác = Chính Tài
 * - khắc ta cùng âm dương = Thất Sát (Thiên Quan); khác = Chính Quan
 * - sinh ta cùng âm dương = Thiên Ấn; khác = Chính Ấn
 */
export function getTenGod(dayMasterStem: number, targetStem: number): TenGodId {
  const samePolarity = stemIsYang(dayMasterStem) === stemIsYang(targetStem);
  const rel = getElementRelation(stemElement(dayMasterStem), stemElement(targetStem));
  switch (rel) {
    case 'ty_hoa':
      return samePolarity ? 'ty_kien' : 'kiep_tai';
    case 'ta_sinh':
      return samePolarity ? 'thuc_than' : 'thuong_quan';
    case 'ta_khac':
      return samePolarity ? 'thien_tai' : 'chinh_tai';
    case 'khac_ta':
      return samePolarity ? 'that_sat' : 'chinh_quan';
    case 'sinh_ta':
      return samePolarity ? 'thien_an' : 'chinh_an';
  }
}

/** Bảng 10x10 tất cả tổ hợp Nhật chủ × Can khác. */
export function buildTenGodMatrix(): TenGodId[][] {
  const table: TenGodId[][] = [];
  for (let dm = 0; dm < 10; dm++) {
    const row: TenGodId[] = [];
    for (let target = 0; target < 10; target++) {
      row.push(getTenGod(dm, target));
    }
    table.push(row);
  }
  return table;
}
