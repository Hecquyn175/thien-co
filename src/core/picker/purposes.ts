import purposesData from '../../data/purposes.json';
import { TrucId } from '../almanac/truc';
import { TenGodId } from '../types';

export type PurposeId =
  | 'cuoi_hoi'
  | 'dong_tho'
  | 'nhap_trach'
  | 'khai_truong'
  | 'ky_hop_dong'
  | 'xuat_hanh'
  | 'thi_cu'
  | 'mua_xe'
  | 'kham_chua_benh'
  | 'gap_doi_tac'
  | 'bat_dau_du_an'
  | 'kien_tung'
  | 'an_tang';

export interface PurposeDef {
  id: PurposeId;
  vi: string;
  allowSecondProfile: boolean;
  preferredTruc: TrucId[];
  avoidTruc: TrucId[];
  preferredThanSat: string[];
  avoidThanSat: string[];
  preferredTenGods: TenGodId[];
  note: string;
}

export const PURPOSES: ReadonlyArray<PurposeDef> =
  purposesData.purposes as unknown as PurposeDef[];

export function getPurposeById(id: PurposeId): PurposeDef {
  const p = PURPOSES.find((x) => x.id === id);
  if (!p) throw new Error(`Không tìm thấy mục đích chọn ngày: ${id}`);
  return p;
}
