import { ENGINE_VERSION } from '../../constants';
import ganzhiData from '../../data/ganzhi.json';
import balanceTpl from '../../data/templates/balance.json';
import dailyNoteTpl from '../../data/templates/daily_note.json';
import directionsTpl from '../../data/templates/directions.json';
import groupIntroTpl from '../../data/templates/group_intro.json';
import healthNoteTpl from '../../data/templates/health_note.json';
import overviewTpl from '../../data/templates/overview.json';
import timeWindowTpl from '../../data/templates/time_window.json';
import { pickDeterministic } from '../rng';
import { ymdFromJdn } from '../time/jdn';
import { EventGroup, ExplainNode, Palace } from '../types';
import { ScoredEvent } from './scorer';
import { SelectionResult } from './selector';
import { SignalBundle } from './signals';

export type LuckRatingId = 'dai_cat' | 'cat' | 'binh' | 'hung' | 'dai_hung';

export interface NarratedEventCard {
  id: string;
  group: EventGroup;
  title: string;
  score: number;
  direction: 'thuan' | 'nghich' | 'trung_tinh';
  directionVi: string;
  intensity: 1 | 2 | 3 | 4 | 5;
  convergenceConfidence: 'thap' | 'vua' | 'cao';
  palace?: Palace;
  situationText: string;
  useAdvice: string;
  avoidAdvice: string;
  remedyAdvice: string;
  safetyNote?: string;
  timeWindowText: string;
  windows: number[];
  explain: ExplainNode;
}

export interface DailyPredictionReport {
  dateISO: string;
  profileId: string;
  engineVersion: string;
  hasProfile: boolean;
  overallScore: number; // 0..100
  ratingId: LuckRatingId;
  ratingLabelVi: string;
  overviewText: string;
  directionSummaryText: string;
  balanceNotes: string[];
  dailyNoteText: string;
  noProfileNotice?: string;
  disclaimerText: string;
  groupIntros: Record<EventGroup, string>;
  groups: Record<EventGroup, NarratedEventCard[]>;
  bundle: SignalBundle;
}

function fillTemplate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export function formatDateISOFromJdn(jdn: number): string {
  const { year, month, day } = ymdFromJdn(jdn);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function computeOverallLuckScore(
  bundle: SignalBundle,
  selection: SelectionResult,
): { overallScore: number; ratingId: LuckRatingId; ratingLabelVi: string } {
  let score = 55;

  if (bundle.almanac.isHoangDaoDay) score += 6;
  else score -= 5;

  if (bundle.almanac.truc.rating === 'cat') score += 6;
  else if (bundle.almanac.truc.rating === 'hung') score -= 7;

  for (const ev of selection.allSelected) {
    if (ev.direction === 'thuan') score += Math.min(8, ev.score * 2.2);
    else if (ev.direction === 'nghich') score -= Math.min(8, ev.score * 2.1);
  }

  const overallScore = Math.max(12, Math.min(96, Math.round(score)));
  let ratingId: LuckRatingId;
  let ratingLabelVi: string;
  if (overallScore >= 80) {
    ratingId = 'dai_cat';
    ratingLabelVi = 'Đại cát';
  } else if (overallScore >= 65) {
    ratingId = 'cat';
    ratingLabelVi = 'Cát';
  } else if (overallScore >= 46) {
    ratingId = 'binh';
    ratingLabelVi = 'Bình hòa';
  } else if (overallScore >= 30) {
    ratingId = 'hung';
    ratingLabelVi = 'Cần cẩn trọng (Hung nhẹ)';
  } else {
    ratingId = 'dai_hung';
    ratingLabelVi = 'Nên tĩnh dưỡng (Đại hung)';
  }
  return { overallScore, ratingId, ratingLabelVi };
}

function narrateSingleCard(
  ev: ScoredEvent,
  dateISO: string,
  profileId: string,
  engineVersion: string,
): NarratedEventCard {
  const baseSeed = `${dateISO}:${profileId}:${ev.def.id}:${engineVersion}`;
  const situationText = pickDeterministic(ev.def.situations, `${baseSeed}:sit`);
  const useAdvice = pickDeterministic(ev.def.advice.use, `${baseSeed}:use`);
  const avoidAdvice = pickDeterministic(ev.def.advice.avoid, `${baseSeed}:avoid`);
  const remedyAdvice = pickDeterministic(ev.def.advice.remedy, `${baseSeed}:remedy`);

  let timeWindowText: string;
  if (ev.windows.length > 0) {
    const names = ev.windows
      .slice(0, 3)
      .map((b) => `${ganzhiData.branches[b].vi} (${ganzhiData.branches[b].hours})`)
      .join(', ');
    const raw = pickDeterministic(timeWindowTpl.variants.has_window, `${baseSeed}:win`);
    timeWindowText = fillTemplate(raw, { gio: names });
  } else {
    timeWindowText = pickDeterministic(timeWindowTpl.variants.no_window, `${baseSeed}:nowin`);
  }

  let safetyNote: string | undefined;
  if (ev.def.group === 'suc_khoe_di_chuyen') {
    safetyNote = pickDeterministic(healthNoteTpl.variants.doctor, `${baseSeed}:doc`);
  } else if (ev.def.group === 'tien_bac') {
    safetyNote = pickDeterministic(healthNoteTpl.variants.finance, `${baseSeed}:fin`);
  } else if (ev.def.id.includes('phap_ly') || ev.def.id.includes('hop_dong')) {
    safetyNote = pickDeterministic(healthNoteTpl.variants.legal, `${baseSeed}:leg`);
  }

  const directionVi =
    ev.direction === 'thuan' ? 'Thuận' : ev.direction === 'nghich' ? 'Nghịch' : 'Trung tính';

  return {
    id: ev.def.id,
    group: ev.def.group,
    title: ev.def.title,
    score: ev.score,
    direction: ev.direction,
    directionVi,
    intensity: ev.intensity,
    convergenceConfidence: ev.convergenceConfidence,
    palace: ev.palace,
    situationText,
    useAdvice,
    avoidAdvice,
    remedyAdvice,
    safetyNote,
    timeWindowText,
    windows: ev.windows,
    explain: ev.explainTree!,
  };
}

export function buildDailyNarrative(
  bundle: SignalBundle,
  selection: SelectionResult,
  engineVersion: string = ENGINE_VERSION,
): DailyPredictionReport {
  const dateISO = formatDateISOFromJdn(bundle.almanac.jdn);
  const profileId = bundle.chart?.profileId ?? 'no_profile';
  const daySeed = `${dateISO}:${profileId}:${engineVersion}`;

  const { overallScore, ratingId, ratingLabelVi } = computeOverallLuckScore(bundle, selection);
  const dayPillarVi = `${ganzhiData.stems[bundle.almanac.dayPillar.stem].vi} ${ganzhiData.branches[bundle.almanac.dayPillar.branch].vi}`;

  const overviewRaw = pickDeterministic(
    overviewTpl.variants[ratingId],
    `${daySeed}:overview`,
  );
  const overviewText = fillTemplate(overviewRaw, {
    can_chi_ngay: dayPillarVi,
    diem: overallScore,
  });

  // Hướng & giờ tốt
  const bestHour = bundle.almanac.topHours[0] ?? bundle.almanac.hours[0];
  const goodDirRaw = pickDeterministic(directionsTpl.variants.good, `${daySeed}:dir`);
  const directionSummaryText = fillTemplate(goodDirRaw, {
    huong: `${bundle.almanac.xuatHanh.hyThanVi} (Hỷ thần) hoặc ${bundle.almanac.xuatHanh.taiThanVi} (Tài thần)`,
    gio: `${bestHour.branchVi} (${bestHour.hoursLabel})`,
  });

  // Cân bằng hai mặt nếu có xung đột
  const balanceNotes = selection.conflicts.map((c, idx) => {
    const raw = pickDeterministic(balanceTpl.variants.both_sides, `${daySeed}:bal:${idx}`);
    return fillTemplate(raw, { ten_a: c.eventATitle, ten_b: c.eventBTitle });
  });

  const noteBucket =
    overallScore >= 65 ? 'thuan' : overallScore < 46 ? 'nghich' : 'binh';
  const dailyNoteText = pickDeterministic(
    dailyNoteTpl.variants[noteBucket],
    `${daySeed}:note`,
  );
  const noProfileNotice = bundle.chart
    ? undefined
    : pickDeterministic(dailyNoteTpl.variants.no_profile, `${daySeed}:noprofile`);
  const disclaimerText = pickDeterministic(
    dailyNoteTpl.variants.disclaimer_short,
    `${daySeed}:disclaimer`,
  );

  const groupIntros: Record<EventGroup, string> = {
    nguoi: pickDeterministic(groupIntroTpl.variants.nguoi, `${daySeed}:intro:nguoi`),
    tien_bac: pickDeterministic(groupIntroTpl.variants.tien_bac, `${daySeed}:intro:tien_bac`),
    cong_viec: pickDeterministic(groupIntroTpl.variants.cong_viec, `${daySeed}:intro:cong_viec`),
    suc_khoe_di_chuyen: pickDeterministic(
      groupIntroTpl.variants.suc_khoe_di_chuyen,
      `${daySeed}:intro:sk`,
    ),
  };

  const groups: Record<EventGroup, NarratedEventCard[]> = {
    nguoi: selection.byGroup.nguoi.map((e) => narrateSingleCard(e, dateISO, profileId, engineVersion)),
    tien_bac: selection.byGroup.tien_bac.map((e) => narrateSingleCard(e, dateISO, profileId, engineVersion)),
    cong_viec: selection.byGroup.cong_viec.map((e) => narrateSingleCard(e, dateISO, profileId, engineVersion)),
    suc_khoe_di_chuyen: selection.byGroup.suc_khoe_di_chuyen.map((e) =>
      narrateSingleCard(e, dateISO, profileId, engineVersion),
    ),
  };

  return {
    dateISO,
    profileId,
    engineVersion,
    hasProfile: Boolean(bundle.chart),
    overallScore,
    ratingId,
    ratingLabelVi,
    overviewText,
    directionSummaryText,
    balanceNotes,
    dailyNoteText,
    noProfileNotice,
    disclaimerText,
    groupIntros,
    groups,
    bundle,
  };
}
