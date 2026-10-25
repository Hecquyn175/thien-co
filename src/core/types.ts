export type ElementId = 'kim' | 'moc' | 'thuy' | 'hoa' | 'tho';

export type StemId =
  | 'giap'
  | 'at'
  | 'binh'
  | 'dinh'
  | 'mau'
  | 'ky'
  | 'canh'
  | 'tan'
  | 'nham'
  | 'quy';

export type BranchId =
  | 'ty'
  | 'suu'
  | 'dan'
  | 'mao'
  | 'thin'
  | 'ti'
  | 'ngo'
  | 'mui'
  | 'than'
  | 'dau'
  | 'tuat'
  | 'hoi';

export type TenGodId =
  | 'ty_kien'
  | 'kiep_tai'
  | 'thuc_than'
  | 'thuong_quan'
  | 'thien_tai'
  | 'chinh_tai'
  | 'that_sat'
  | 'chinh_quan'
  | 'thien_an'
  | 'chinh_an';

export type ConfidenceLevel = 'A' | 'B' | 'C';

export type BaguaDir =
  | 'bac'
  | 'dong_bac'
  | 'dong'
  | 'dong_nam'
  | 'nam'
  | 'tay_nam'
  | 'tay'
  | 'tay_bac';

export type Layer =
  | 'ten_god'
  | 'branch_relation'
  | 'stem_relation'
  | 'useful_god'
  | 'almanac'
  | 'than_sat'
  | 'luck_cycle'
  | 'flying_star'
  | 'qimen'
  | 'iching';

export type Palace =
  | 'ban_than'
  | 'phoi_ngau'
  | 'su_nghiep_cha_me'
  | 'goc_moi_truong'
  | 'con_cai_cap_duoi';

export type EventGroup = 'nguoi' | 'tien_bac' | 'cong_viec' | 'suc_khoe_di_chuyen';

export interface ExplainNode {
  ruleId: string;
  summary: string;
  source: string;
  confidence: ConfidenceLevel;
  contribution?: number;
  children?: ExplainNode[];
}

export interface Signal {
  id: string;
  layer: Layer;
  strength: number;
  valence: number;
  palace?: Palace;
  window?: number[];
  direction?: BaguaDir;
  tags: string[];
  explain: ExplainNode;
}
