import { computeMenhQuai, Gender, MenhQuaiResult } from '../directions/menh-quai';
import { getHiddenStems, HiddenStemEntry } from '../ganzhi/hidden-stems';
import { ZiHourConvention, DEFAULT_ZI_CONVENTION } from '../ganzhi/hour-pillar';
import { getNayinForPillar, NayinInfo } from '../ganzhi/nayin';
import { fourPillars, Pillar } from '../ganzhi/pillars';
import { getTenGod } from '../relations/ten-gods';
import { lunarToSolarVN } from '../time/lunar-vn';
import { instantFromLocalString, parseLocalDateTime, fromLocalParts } from '../time/tz';
import { TenGodId } from '../types';
import { computeLuckCycles, LuckCyclesResult } from './luck-cycles';
import { analyzeStrength, StrengthAnalysis } from './strength';
import { selectUsefulGod, UsefulGodAnalysis } from './useful-god';

export interface ProfileBirth {
  /** Chuỗi giờ treo tường YYYY-MM-DD hoặc YYYY-MM-DDTHH:mm */
  datetime: string;
  /** Offset phút so với UTC (mặc định 420 = UTC+7) */
  tz: number;
  calendar: 'solar' | 'lunar';
  isLeapMonth?: boolean;
}

export interface Profile {
  id: string;
  name: string;
  birth: ProfileBirth;
  birthTimeKnown: boolean;
  gender: Gender;
  luckForwardOverride?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AnnotatedHiddenStem extends HiddenStemEntry {
  tenGod: TenGodId;
}

export interface AnnotatedPillar {
  pillar: Pillar;
  stemTenGod: TenGodId;
  hiddenStems: AnnotatedHiddenStem[];
  nayin: NayinInfo;
}

export interface BaziChart {
  profileId: string;
  birthInstant: number;
  tzOffsetMinutes: number;
  birthTimeKnown: boolean;
  baziYear: number;
  dayMasterStem: number;
  year: AnnotatedPillar;
  month: AnnotatedPillar;
  day: AnnotatedPillar;
  hour?: AnnotatedPillar;
  strength: StrengthAnalysis;
  usefulGod: UsefulGodAnalysis;
  luckCycles: LuckCyclesResult;
  menhQuai: MenhQuaiResult;
}

function annotatePillar(pillar: Pillar, dayMasterStem: number): AnnotatedPillar {
  const hiddenStems: AnnotatedHiddenStem[] = getHiddenStems(pillar.branch).map((h) => ({
    ...h,
    tenGod: getTenGod(dayMasterStem, h.stem),
  }));
  return {
    pillar,
    stemTenGod: getTenGod(dayMasterStem, pillar.stem),
    hiddenStems,
    nayin: getNayinForPillar(pillar),
  };
}

export function resolveBirthInstant(birth: ProfileBirth, birthTimeKnown: boolean): number {
  const parts = parseLocalDateTime(birth.datetime);
  const hour = birthTimeKnown ? parts.hour : 12;
  const minute = birthTimeKnown ? parts.minute : 0;

  if (birth.calendar === 'lunar') {
    const solar = lunarToSolarVN(
      parts.year,
      parts.month,
      parts.day,
      Boolean(birth.isLeapMonth),
      birth.tz,
    );
    if (!solar) {
      throw new Error(`Ngày âm lịch không tồn tại: ${birth.datetime}`);
    }
    return fromLocalParts(solar.year, solar.month, solar.day, hour, minute, 0, birth.tz);
  }
  if (!birthTimeKnown) {
    return fromLocalParts(parts.year, parts.month, parts.day, 12, 0, 0, birth.tz);
  }
  return instantFromLocalString(birth.datetime, birth.tz);
}

export function buildBaziChart(
  profile: Profile,
  ziConvention: ZiHourConvention = DEFAULT_ZI_CONVENTION,
): BaziChart {
  const birthInstant = resolveBirthInstant(profile.birth, profile.birthTimeKnown);
  const fp = fourPillars(birthInstant, {
    tzOffsetMinutes: profile.birth.tz,
    ziHourConvention: ziConvention,
  });

  const dm = fp.day.stem;
  const year = annotatePillar(fp.year, dm);
  const month = annotatePillar(fp.month, dm);
  const day = annotatePillar(fp.day, dm);
  const hour = profile.birthTimeKnown ? annotatePillar(fp.hour, dm) : undefined;

  const strength = analyzeStrength({
    year: fp.year,
    month: fp.month,
    day: fp.day,
    hour: profile.birthTimeKnown ? fp.hour : undefined,
  });

  const usefulGod = selectUsefulGod(strength, fp.month.branch);
  const luckCycles = computeLuckCycles(
    birthInstant,
    fp.baziYear,
    fp.year,
    fp.month,
    profile.gender,
    profile.luckForwardOverride,
  );
  const menhQuai = computeMenhQuai(fp.baziYear, profile.gender);

  return {
    profileId: profile.id,
    birthInstant,
    tzOffsetMinutes: profile.birth.tz,
    birthTimeKnown: profile.birthTimeKnown,
    baziYear: fp.baziYear,
    dayMasterStem: dm,
    year,
    month,
    day,
    hour,
    strength,
    usefulGod,
    luckCycles,
    menhQuai,
  };
}
