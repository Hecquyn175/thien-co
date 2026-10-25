import { Palace } from '../types';

export type natalBranchSlot = 'nien_chi' | 'nguyet_chi' | 'nhat_chi' | 'gio_chi';

export interface PalaceInfo {
  id: Palace;
  slot: natalBranchSlot;
  pillarVi: string;
  vi: string;
  domains: string;
}

export const PALACE_INFOS: Record<natalBranchSlot, PalaceInfo> = {
  nien_chi: {
    id: 'goc_moi_truong',
    slot: 'nien_chi',
    pillarVi: 'Chi năm',
    vi: 'Gốc / Môi trường',
    domains: 'Gia đình gốc, tổ nghiệp, môi trường xã hội bên ngoài',
  },
  nguyet_chi: {
    id: 'su_nghiep_cha_me',
    slot: 'nguyet_chi',
    pillarVi: 'Chi tháng',
    vi: 'Sự nghiệp / Cha mẹ',
    domains: 'Công việc, cấp trên, nề nếp, cha mẹ',
  },
  nhat_chi: {
    id: 'phoi_ngau',
    slot: 'nhat_chi',
    pillarVi: 'Chi ngày',
    vi: 'Bản thân / Phối ngẫu',
    domains: 'Nội tâm, tình cảm, người bạn đời / người gần gũi nhất',
  },
  gio_chi: {
    id: 'con_cai_cap_duoi',
    slot: 'gio_chi',
    pillarVi: 'Chi giờ',
    vi: 'Con cái / Cấp dưới',
    domains: 'Kế hoạch dài hạn, người dưới quyền, con cái, thành quả',
  },
};

export function palaceForSlot(slot: natalBranchSlot): Palace {
  return PALACE_INFOS[slot].id;
}
