import nayinData from '../../data/nayin.json';
import { Pillar, pillarToSexagenary } from './pillars';
import { ElementId } from '../types';

export interface NayinInfo {
  sexagenaryIndex: number;
  pairIndex: number;
  vi: string;
  han: string;
  element: ElementId;
}

export function getNayinForSexagenary(sexagenaryIndex: number): NayinInfo {
  const k = ((sexagenaryIndex % 60) + 60) % 60;
  const pairIndex = Math.floor(k / 2);
  const p = nayinData.pairs[pairIndex];
  return {
    sexagenaryIndex: k,
    pairIndex,
    vi: p.vi,
    han: p.han,
    element: p.element as ElementId,
  };
}

export function getNayinForPillar(pillar: Pillar): NayinInfo {
  const idx = pillarToSexagenary(pillar);
  if (idx < 0) {
    throw new Error(`Tổ hợp Can-Chi không hợp lệ: stem=${pillar.stem}, branch=${pillar.branch}`);
  }
  return getNayinForSexagenary(idx);
}
