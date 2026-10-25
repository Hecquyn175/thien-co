import qimenData from '../../data/qimen.json';
import { fourPillars, Pillar, pillarToSexagenary } from '../ganzhi/pillars';
import { ZiHourConvention, DEFAULT_ZI_CONVENTION } from '../ganzhi/hour-pillar';
import { mod } from '../time/jdn';
import { currentSolarTerm } from '../time/solar-terms';
import { BaguaDir, ConfidenceLevel } from '../types';
import { getTrigramByDirection } from './bagua';

export type QimenDoorId =
  | 'huu_mon'
  | 'sinh_mon'
  | 'thuong_mon'
  | 'do_mon'
  | 'canh_mon'
  | 'tu_mon'
  | 'kinh_mon'
  | 'khai_mon';

export interface QimenDoorMeta {
  id: QimenDoorId;
  vi: string;
  han: string;
  homePalace: number;
  element: string;
  rating: 'cat' | 'binh' | 'hung';
  summary: string;
}

export interface QimenStarMeta {
  id: string;
  vi: string;
  han: string;
  homePalace: number;
  rating: 'cat' | 'binh' | 'hung';
}

export interface QimenDeityMeta {
  id: string;
  vi: string;
  han: string;
  rating: 'cat' | 'binh' | 'hung';
  summary: string;
}

export interface QimenPalaceState {
  direction: BaguaDir;
  directionVi: string;
  loShuPalace: number;
  earthStem: string;
  heavenStem: string;
  door: QimenDoorMeta;
  star: QimenStarMeta;
  deity: QimenDeityMeta;
  rating: 'cat' | 'binh' | 'hung';
  summary: string;
}

export interface QimenBoard {
  method: string;
  methodLabelVi: string;
  solarTermId: string;
  solarTermVi: string;
  yuan: 0 | 1 | 2;
  yuanVi: 'Thượng nguyên' | 'Trung nguyên' | 'Hạ nguyên';
  duongDon: boolean;
  juNumber: number; // 1..9
  hourPillar: Pillar;
  overallRating: 'cat' | 'binh' | 'hung';
  auspiciousDoorsInGoodPalaces: QimenDoorId[];
  bestDirections: QimenPalaceState[];
  byDirection: Record<BaguaDir, QimenPalaceState>;
  confidence: ConfidenceLevel;
}

const RING_ORDER = qimenData.ringOrder as BaguaDir[];
const LOSHU_BY_DIR = qimenData.loShuByDir as Record<BaguaDir, number>;
const DOORS = qimenData.doors as QimenDoorMeta[];
const STARS = qimenData.stars as QimenStarMeta[];
const DEITIES = qimenData.deities as QimenDeityMeta[];

/** Thứ tự Tam kỳ Lục nghi trên Địa bàn: Mậu, Kỷ, Canh, Tân, Nhâm, Quý, Đinh, Bính, Ất */
const SAN_QI_LIU_YI = ['Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý', 'Đinh', 'Bính', 'Ất'];

/**
 * Xác định Tam nguyên (0=Thượng, 1=Trung, 2=Hạ) theo Sách Bổ pháp (拆補法):
 * tìm Phù Đầu của ngày (Giáp Tý=0, Kỷ Mão=15, Giáp Ngọ=30, Kỷ Dậu=45 → Thượng nguyên;
 * Giáp Thân=20, Kỷ Hợi=35, Giáp Dần=50, Kỷ Tỵ=5 → Trung nguyên;
 * Giáp Thìn=40, Kỷ Mùi=55, Giáp Tuất=10, Kỷ Sửu=25 → Hạ nguyên).
 */
export function getSachBoYuan(dayPillar: Pillar): 0 | 1 | 2 {
  const sex = pillarToSexagenary(dayPillar);
  const fuTou = sex - (sex % 5); // Giáp hoặc Kỷ đầu tuần 5 ngày
  const branch = fuTou % 12;
  if (branch === 0 || branch === 6 || branch === 3 || branch === 9) return 0; // Tý Ngọ Mão Dậu -> Thượng
  if (branch === 2 || branch === 8 || branch === 5 || branch === 11) return 1; // Dần Thân Tỵ Hợi -> Trung
  return 2; // Thìn Tuất Sửu Mùi -> Hạ
}

export function computeQimenBoard(
  instant: number,
  tzOffsetMinutes: number,
  ziConvention: ZiHourConvention = DEFAULT_ZI_CONVENTION,
): QimenBoard {
  const fp = fourPillars(instant, { tzOffsetMinutes, ziHourConvention: ziConvention });
  const { term } = currentSolarTerm(instant);
  const yuan = getSachBoYuan(fp.day);
  const yuanVi = yuan === 0 ? 'Thượng nguyên' : yuan === 1 ? 'Trung nguyên' : 'Hạ nguyên';

  const termEntry = (qimenData.juBySolarTerm as unknown as Record<
    string,
    { duongDon: boolean; yuan: [number, number, number] }
  >)[term.def.id] ?? { duongDon: true, yuan: [1, 7, 4] };

  const duongDon = termEntry.duongDon;
  const juNumber = termEntry.yuan[yuan];

  // Địa bàn: an Tam kỳ Lục nghi bắt đầu từ cung = juNumber, Dương độn đi thuận (1..9), Âm độn đi nghịch (9..1)
  const earthStemByPalace: Record<number, string> = {};
  for (let i = 0; i < 9; i++) {
    const p = duongDon ? mod(juNumber - 1 + i, 9) + 1 : mod(juNumber - 1 - i, 9) + 1;
    earthStemByPalace[p] = SAN_QI_LIU_YI[i];
  }

  // Tuần thủ của giờ (Giáp Tý Mậu, Giáp Tuất Kỷ, Giáp Thân Canh, Giáp Ngọ Tân, Giáp Thìn Nhâm, Giáp Dần Quý)
  const hourSex = pillarToSexagenary(fp.hour);
  const xunIndex = Math.floor(hourSex / 10); // 0..5
  const offsetInXun = hourSex % 10; // số bước từ Tuần thủ tới giờ hiện tại

  // Chuyển Bàn trên vòng 8 cung ngoài (RING_ORDER)
  const stepSign = duongDon ? 1 : -1;
  const baseShift = mod(xunIndex + stepSign * offsetInXun, 8);
  const doorShift = mod(xunIndex + stepSign * (offsetInXun + juNumber), 8);

  const byDirection = {} as Record<BaguaDir, QimenPalaceState>;
  const auspiciousDoorsInGoodPalaces: QimenDoorId[] = [];
  let catCount = 0;
  let hungCount = 0;

  for (let idx = 0; idx < 8; idx++) {
    const dir = RING_ORDER[idx];
    const loShu = LOSHU_BY_DIR[dir];
    const door = DOORS[mod(idx - doorShift, 8)];
    const star = STARS[mod(idx - baseShift, 8)];
    const deity = DEITIES[mod(stepSign * (idx - baseShift), 8)];

    const earthStem = earthStemByPalace[loShu] ?? 'Mậu';
    const heavenPalace = LOSHU_BY_DIR[RING_ORDER[mod(idx - baseShift, 8)]];
    const heavenStem = earthStemByPalace[heavenPalace] ?? 'Kỷ';

    let score = 0;
    if (door.rating === 'cat') score += 2;
    else if (door.rating === 'hung') score -= 2;
    if (star.rating === 'cat') score += 1;
    else if (star.rating === 'hung') score -= 1;
    if (deity.rating === 'cat') score += 1;
    else if (deity.rating === 'hung') score -= 1;

    const rating: 'cat' | 'binh' | 'hung' = score >= 2 ? 'cat' : score <= -2 ? 'hung' : 'binh';
    if (rating === 'cat') {
      catCount++;
      if (door.rating === 'cat') auspiciousDoorsInGoodPalaces.push(door.id);
    } else if (rating === 'hung') {
      hungCount++;
    }

    const dirVi = getTrigramByDirection(dir).directionVi;
    byDirection[dir] = {
      direction: dir,
      directionVi: dirVi,
      loShuPalace: loShu,
      earthStem,
      heavenStem,
      door,
      star,
      deity,
      rating,
      summary: `${dirVi}: ${door.vi} · ${star.vi} · ${deity.vi} (${heavenStem}/${earthStem}) — ${door.summary}`,
    };
  }

  const overallRating: 'cat' | 'binh' | 'hung' =
    catCount > hungCount ? 'cat' : hungCount > catCount ? 'hung' : 'binh';

  const bestDirections = Object.values(byDirection)
    .filter((p) => p.rating === 'cat' || p.door.rating === 'cat')
    .sort((a, b) => (b.rating === 'cat' ? 1 : 0) - (a.rating === 'cat' ? 1 : 0));

  return {
    method: qimenData.method,
    methodLabelVi: qimenData.methodLabelVi,
    solarTermId: term.def.id,
    solarTermVi: term.def.vi,
    yuan,
    yuanVi,
    duongDon,
    juNumber,
    hourPillar: fp.hour,
    overallRating,
    auspiciousDoorsInGoodPalaces,
    bestDirections,
    byDirection,
    confidence: 'C',
  };
}
