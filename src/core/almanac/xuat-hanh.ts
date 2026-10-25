import xuatHanhData from '../../data/xuat-hanh.json';
import { getTrigramByDirection } from '../directions/bagua';
import { Pillar, pillarToSexagenary } from '../ganzhi/pillars';
import { BaguaDir } from '../types';

export interface XuatHanhInfo {
  hyThan: BaguaDir;
  hyThanVi: string;
  taiThan: BaguaDir;
  taiThanVi: string;
  hacThan: BaguaDir | 'trung_cung';
  hacThanVi: string;
  hacThanNote: string;
}

export function getXuatHanhDirections(dayPillar: Pillar): XuatHanhInfo {
  const stemEntry = xuatHanhData.byDayStem[dayPillar.stem];
  const hyThan = stemEntry.hyThan as BaguaDir;
  const taiThan = stemEntry.taiThan as BaguaDir;

  const sex = pillarToSexagenary(dayPillar);
  const hacEntry =
    xuatHanhData.hacThan60.find((r) => sex >= r.fromSexagenary && sex <= r.toSexagenary) ??
    xuatHanhData.hacThan60[xuatHanhData.hacThan60.length - 1];
  const hacThan = hacEntry.direction as BaguaDir | 'trung_cung';

  return {
    hyThan,
    hyThanVi: getTrigramByDirection(hyThan).directionVi,
    taiThan,
    taiThanVi: getTrigramByDirection(taiThan).directionVi,
    hacThan,
    hacThanVi:
      hacThan === 'trung_cung' ? 'Trung cung (tại chỗ)' : getTrigramByDirection(hacThan).directionVi,
    hacThanNote: hacEntry.note,
  };
}
