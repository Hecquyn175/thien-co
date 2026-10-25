import tu28Data from '../../data/tu28.json';
import { mod } from '../time/jdn';
import { ConfidenceLevel, ElementId } from '../types';

export interface Tu28Info {
  index: number;
  id: string;
  vi: string;
  fullVi: string;
  han: string;
  group: string;
  element: ElementId;
  rating: 'cat' | 'binh' | 'hung';
  summary: string;
  nen: string[];
  ky: string[];
  source: string;
  confidence: ConfidenceLevel;
}

export const TU28_LIST: ReadonlyArray<Tu28Info> = (
  tu28Data.items as Omit<Tu28Info, 'index'>[]
).map((item, index) => ({ ...item, index }));

/**
 * Tính sao trong Nhị thập bát tú cho một ngày JDN (chu kỳ 28 ngày liên tục).
 * Điểm neo: JDN 2451545 (2000-01-01) là sao Tất (index 18).
 */
export function getTu28ForJdn(jdn: number): Tu28Info {
  const idx = mod(jdn - tu28Data.anchorJdn + tu28Data.anchorIndex, 28);
  return TU28_LIST[idx];
}
