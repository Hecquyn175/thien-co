import ganzhiData from '../../data/ganzhi.json';
import purposesData from '../../data/purposes.json';
import { BaziChart } from '../bazi/chart';
import { classifyElementForUsefulGod } from '../bazi/useful-god';
import { hourStemFor } from '../ganzhi/hour-pillar';
import { getNayinForPillar, NayinInfo } from '../ganzhi/nayin';
import {
  baziYearOf,
  civilDayPillar,
  monthBranchOf,
  monthPillarFrom,
  Pillar,
  yearPillarFromYear,
} from '../ganzhi/pillars';
import { branchElement, stemElement } from '../relations/elements';
import { isLucXung } from '../relations/stem-branch-relations';
import { jdnToLunar, LunarDate } from '../time/lunar-vn';
import { currentSolarTerm, SolarTermInstant } from '../time/solar-terms';
import { localJdn, localMidnightInstant } from '../time/tz';
import { getDayHoangDao, getHourHoangDao, HoangDaoDeity } from './hoang-dao';
import { evaluateThanSat, ThanSatHit } from './than-sat';
import { getTrucForDay, TrucInfo } from './truc';
import { getTu28ForJdn, Tu28Info } from './tu28';
import { getXuatHanhDirections, XuatHanhInfo } from './xuat-hanh';

export interface HourSlotInfo {
  branch: number;
  branchVi: string;
  branchHan: string;
  hoursLabel: string;
  pillar: Pillar;
  pillarVi: string;
  pillarHan: string;
  deity: HoangDaoDeity;
  isHoangDao: boolean;
  /** Điểm 0..100 (có xét lá số nếu truyền vào) */
  score: number;
  personalNote?: string;
}

export function computeHoursOfDay(dayPillar: Pillar, chart?: BaziChart): HourSlotInfo[] {
  const slots: HourSlotInfo[] = [];
  for (let hb = 0; hb < 12; hb++) {
    const stem = hourStemFor(dayPillar.stem, hb);
    const pillar: Pillar = { stem, branch: hb };
    const deity = getHourHoangDao(dayPillar.branch, hb);
    const bDef = ganzhiData.branches[hb];
    const sDef = ganzhiData.stems[stem];

    let score = deity.hoangDao ? 72 : 38;
    const notes: string[] = [];

    if (isLucXung(hb, dayPillar.branch)) {
      score -= 12;
      notes.push('Xung Chi ngày');
    }

    if (chart) {
      const stemClass = classifyElementForUsefulGod(stemElement(stem), chart.usefulGod);
      const branchClass = classifyElementForUsefulGod(branchElement(hb), chart.usefulGod);
      if (stemClass === 'dung') {
        score += 10;
        notes.push('Can giờ hợp Dụng thần');
      } else if (stemClass === 'ky') {
        score -= 8;
      }
      if (branchClass === 'dung') {
        score += 12;
        notes.push('Chi giờ hợp Dụng thần');
      } else if (branchClass === 'ky') {
        score -= 10;
      }
      if (isLucXung(hb, chart.day.pillar.branch)) {
        score -= 15;
        notes.push('Xung Nhật chi bản mệnh');
      }
    }

    score = Math.max(5, Math.min(98, score));
    slots.push({
      branch: hb,
      branchVi: bDef.vi,
      branchHan: bDef.han,
      hoursLabel: bDef.hours,
      pillar,
      pillarVi: `${sDef.vi} ${bDef.vi}`,
      pillarHan: `${sDef.han}${bDef.han}`,
      deity,
      isHoangDao: deity.hoangDao,
      score,
      personalNote: notes.length ? notes.join(' · ') : undefined,
    });
  }
  return slots;
}

export interface PurposeLabel {
  id: string;
  vi: string;
  note?: string;
}

export interface DayAlmanac {
  jdn: number;
  lunar: LunarDate;
  yearPillar: Pillar;
  monthPillar: Pillar;
  dayPillar: Pillar;
  dayNayin: NayinInfo;
  solarTerm: SolarTermInstant;
  nextSolarTerm: SolarTermInstant;
  truc: TrucInfo;
  tu28: Tu28Info;
  hoangDaoDeity: HoangDaoDeity;
  isHoangDaoDay: boolean;
  thanSat: ThanSatHit[];
  xuatHanh: XuatHanhInfo;
  hours: HourSlotInfo[];
  topHours: HourSlotInfo[];
  nen: PurposeLabel[];
  ky: PurposeLabel[];
}

const PURPOSE_MAP = new Map<string, { id: string; vi: string; note: string }>(
  purposesData.purposes.map((p) => [p.id, { id: p.id, vi: p.vi, note: p.note }]),
);

export function computeDayAlmanac(
  instant: number,
  tzOffsetMinutes: number,
  chart?: BaziChart,
): DayAlmanac {
  const jdn = localJdn(instant, tzOffsetMinutes);
  // Dùng 12:00 trưa địa phương của ngày JDN để lấy tiết khí và trụ tháng/năm đại diện cho ngày
  const noonInstant = localMidnightInstant(jdn, tzOffsetMinutes) + 12 * 3_600_000;
  const lunar = jdnToLunar(jdn, tzOffsetMinutes);
  const baziYear = baziYearOf(noonInstant, tzOffsetMinutes);
  const yearPillar = yearPillarFromYear(baziYear);
  const { branch: monthBranch } = monthBranchOf(noonInstant);
  const monthPillar = monthPillarFrom(yearPillar.stem, monthBranch);
  const dayPillar = civilDayPillar(noonInstant, tzOffsetMinutes);
  const dayNayin = getNayinForPillar(dayPillar);
  const { term: solarTerm, next: nextSolarTerm } = currentSolarTerm(noonInstant);

  const truc = getTrucForDay(monthBranch, dayPillar.branch);
  const tu28 = getTu28ForJdn(jdn);
  const hoangDaoDeity = getDayHoangDao(monthBranch, dayPillar.branch);
  const thanSat = evaluateThanSat(monthBranch, dayPillar, lunar);
  const xuatHanh = getXuatHanhDirections(dayPillar);
  const hours = computeHoursOfDay(dayPillar, chart);
  const topHours = [...hours]
    .filter((h) => h.isHoangDao)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  // Tổng hợp Nên / Kỵ chuẩn hóa
  const nenSet = new Set<string>([...truc.nen, ...tu28.nen]);
  const kySet = new Set<string>([...truc.ky, ...tu28.ky]);

  const majorBadStars = new Set([
    'sat_chu',
    'tho_tu',
    'nguyet_pha',
    'duong_cong_ky',
    'tam_nuong',
    'nguyet_ky',
  ]);
  if (thanSat.some((s) => majorBadStars.has(s.id))) {
    for (const pid of ['cuoi_hoi', 'khai_truong', 'dong_tho', 'nhap_trach']) {
      kySet.add(pid);
      nenSet.delete(pid);
    }
  }
  // Nếu vừa nằm trong Nên vừa nằm trong Kỵ, ưu tiên đưa vào Kỵ để cẩn trọng
  for (const k of kySet) nenSet.delete(k);

  const toLabels = (ids: Iterable<string>): PurposeLabel[] =>
    Array.from(ids)
      .map((id) => PURPOSE_MAP.get(id))
      .filter((x): x is { id: string; vi: string; note: string } => Boolean(x));

  return {
    jdn,
    lunar,
    yearPillar,
    monthPillar,
    dayPillar,
    dayNayin,
    solarTerm,
    nextSolarTerm,
    truc,
    tu28,
    hoangDaoDeity,
    isHoangDaoDay: hoangDaoDeity.hoangDao,
    thanSat,
    xuatHanh,
    hours,
    topHours,
    nen: toLabels(nenSet),
    ky: toLabels(kySet),
  };
}
