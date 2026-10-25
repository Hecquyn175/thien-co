import baguaData from '../../data/bagua.json';
import { BaguaDir, ElementId } from '../types';

export type TrigramId = 'kham' | 'khon' | 'chan' | 'ton' | 'can' | 'doai' | 'gen' | 'ly';

export interface BaguaTrigram {
  id: TrigramId;
  number: number;
  vi: string;
  han: string;
  symbol: string;
  lines: string;
  element: ElementId;
  direction: BaguaDir;
  directionVi: string;
  degreeCenter: number;
  lifeArea: string;
  person: string;
}

export const BAGUA_TRIGRAMS: ReadonlyArray<BaguaTrigram> =
  baguaData.trigrams as BaguaTrigram[];

export function getTrigramById(id: TrigramId): BaguaTrigram {
  const t = BAGUA_TRIGRAMS.find((x) => x.id === id);
  if (!t) throw new Error(`Không tìm thấy quẻ Bát quái: ${id}`);
  return t;
}

export function getTrigramByDirection(dir: BaguaDir): BaguaTrigram {
  const t = BAGUA_TRIGRAMS.find((x) => x.direction === dir);
  if (!t) throw new Error(`Không tìm thấy hướng Bát quái: ${dir}`);
  return t;
}

/** Thứ tự 8 hướng theo chiều kim đồng hồ từ Bắc (0°) để vẽ la bàn (Bắc dưới / Nam trên hoặc chuẩn). */
export const COMPASS_DIRECTIONS_CW: ReadonlyArray<BaguaDir> = [
  'bac',
  'dong_bac',
  'dong',
  'dong_nam',
  'nam',
  'tay_nam',
  'tay',
  'tay_bac',
];
