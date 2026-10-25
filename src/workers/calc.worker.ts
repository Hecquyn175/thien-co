import { rankDatesForPurpose, type DatePickerResult, type PickerRangeDays } from '../core/picker/rank';
import type { PurposeId } from '../core/picker/purposes';
import { predictDayEvents } from '../core/events';
import type { DailyPredictionReport } from '../core/events/narrator';
import { computeDayAlmanac, type DayAlmanac } from '../core/almanac/gio-dep';
import { buildBaziChart, type Profile } from '../core/bazi/chart';
import type { ZiHourConvention } from '../core/ganzhi/hour-pillar';

export interface RankDatesPayload {
  startInstant: number;
  rangeDays: PickerRangeDays;
  purposeId: PurposeId;
  tzOffsetMinutes: number;
  ziConvention: ZiHourConvention;
  profile: Profile | null;
  secondProfile?: Profile | null;
}

export interface PredictDayPayload {
  instant: number;
  tzOffsetMinutes: number;
  ziConvention: ZiHourConvention;
  profile: Profile | null;
}

export interface MonthSummaryPayload {
  year: number;
  month: number;
  tzOffsetMinutes: number;
  ziConvention: ZiHourConvention;
  profile: Profile | null;
}

export type WorkerRequest =
  | { id: number; type: 'RANK_DATES'; payload: RankDatesPayload }
  | { id: number; type: 'PREDICT_DAY'; payload: PredictDayPayload }
  | { id: number; type: 'MONTH_SUMMARY'; payload: MonthSummaryPayload };

export interface MonthDayCellSummary {
  day: number;
  dateStr: string;
  almanac: DayAlmanac;
  luckScore: number;
  luckLabel: string;
  topGroupScores: Record<string, number>;
}

export type WorkerResponse =
  | { id: number; ok: true; result: DatePickerResult | DailyPredictionReport | MonthDayCellSummary[] }
  | { id: number; ok: false; error: string };

export function computeRankDatesSync(payload: RankDatesPayload): DatePickerResult {
  const chart1 = payload.profile ? buildBaziChart(payload.profile, payload.ziConvention) : undefined;
  const chart2 = payload.secondProfile
    ? buildBaziChart(payload.secondProfile, payload.ziConvention)
    : undefined;
  return rankDatesForPurpose(
    payload.startInstant,
    payload.rangeDays,
    payload.purposeId,
    payload.tzOffsetMinutes,
    chart1,
    chart2,
  );
}

export function computePredictDaySync(payload: PredictDayPayload): DailyPredictionReport {
  const chart = payload.profile ? buildBaziChart(payload.profile, payload.ziConvention) : undefined;
  return predictDayEvents(payload.instant, chart, {
    tzOffsetMinutes: payload.tzOffsetMinutes,
    ziHourConvention: payload.ziConvention,
  });
}

export function computeMonthSummarySync(payload: MonthSummaryPayload): MonthDayCellSummary[] {
  const { year, month, tzOffsetMinutes, ziConvention, profile } = payload;
  const chart = profile ? buildBaziChart(profile, ziConvention) : undefined;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const out: MonthDayCellSummary[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const dateStr = `${year}-${mm}-${dd}`;
    const instant = Date.UTC(year, month - 1, d, 12, 0, 0) - tzOffsetMinutes * 60_000;
    const almanac = computeDayAlmanac(instant, tzOffsetMinutes, chart);
    const pred = predictDayEvents(instant, chart, {
      tzOffsetMinutes,
      ziHourConvention: ziConvention,
    });
    const topGroupScores: Record<string, number> = {
      nguoi: pred.groups.nguoi[0]?.score ?? 0,
      tien_bac: pred.groups.tien_bac[0]?.score ?? 0,
      cong_viec: pred.groups.cong_viec[0]?.score ?? 0,
      suc_khoe_di_chuyen: pred.groups.suc_khoe_di_chuyen[0]?.score ?? 0,
    };
    out.push({
      day: d,
      dateStr,
      almanac,
      luckScore: pred.overallScore,
      luckLabel: pred.ratingLabelVi,
      topGroupScores,
    });
  }
  return out;
}

if (typeof self !== 'undefined' && typeof (self as unknown as { postMessage?: unknown }).postMessage === 'function') {
  self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
    const msg = ev.data;
    if (!msg || typeof msg.id !== 'number') return;
    try {
      if (msg.type === 'RANK_DATES') {
        const result = computeRankDatesSync(msg.payload);
        const resp: WorkerResponse = { id: msg.id, ok: true, result };
        self.postMessage(resp);
      } else if (msg.type === 'PREDICT_DAY') {
        const result = computePredictDaySync(msg.payload);
        const resp: WorkerResponse = { id: msg.id, ok: true, result };
        self.postMessage(resp);
      } else if (msg.type === 'MONTH_SUMMARY') {
        const result = computeMonthSummarySync(msg.payload);
        const resp: WorkerResponse = { id: msg.id, ok: true, result };
        self.postMessage(resp);
      }
    } catch (err) {
      const resp: WorkerResponse = {
        id: msg.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(resp);
    }
  };
}
