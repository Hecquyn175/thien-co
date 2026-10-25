import type { DatePickerResult } from '../core/picker/rank';
import type { DailyPredictionReport } from '../core/events/narrator';
import {
  computeRankDatesSync,
  computePredictDaySync,
  computeMonthSummarySync,
  type RankDatesPayload,
  type PredictDayPayload,
  type MonthSummaryPayload,
  type MonthDayCellSummary,
  type WorkerRequest,
  type WorkerResponse,
} from './calc.worker';

let workerInstance: Worker | null = null;
let workerFailed = false;
let reqId = 1;
const pending = new Map<
  number,
  { resolve: (val: unknown) => void; reject: (err: Error) => void }
>();

function getWorker(): Worker | null {
  if (workerFailed || typeof Worker === 'undefined') return null;
  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL('./calc.worker.ts', import.meta.url), {
        type: 'module',
      });
      workerInstance.onmessage = (ev: MessageEvent<WorkerResponse>) => {
        const data = ev.data;
        const p = pending.get(data.id);
        if (!p) return;
        pending.delete(data.id);
        if (data.ok) {
          p.resolve(data.result);
        } else {
          p.reject(new Error(data.error));
        }
      };
      workerInstance.onerror = () => {
        workerFailed = true;
      };
    } catch {
      workerFailed = true;
      return null;
    }
  }
  return workerInstance;
}

export async function runRankDatesInWorker(input: RankDatesPayload): Promise<DatePickerResult> {
  const w = getWorker();
  if (!w) return computeRankDatesSync(input);

  const id = reqId++;
  return new Promise<DatePickerResult>((resolve, reject) => {
    pending.set(id, {
      resolve: (val) => resolve(val as DatePickerResult),
      reject,
    });
    const msg: WorkerRequest = { id, type: 'RANK_DATES', payload: input };
    w.postMessage(msg);
  });
}

export async function runPredictDayInWorker(input: PredictDayPayload): Promise<DailyPredictionReport> {
  const w = getWorker();
  if (!w) return computePredictDaySync(input);

  const id = reqId++;
  return new Promise<DailyPredictionReport>((resolve, reject) => {
    pending.set(id, {
      resolve: (val) => resolve(val as DailyPredictionReport),
      reject,
    });
    const msg: WorkerRequest = { id, type: 'PREDICT_DAY', payload: input };
    w.postMessage(msg);
  });
}

export async function runMonthSummaryInWorker(
  payload: MonthSummaryPayload,
): Promise<MonthDayCellSummary[]> {
  const w = getWorker();
  if (!w) return computeMonthSummarySync(payload);

  const id = reqId++;
  return new Promise<MonthDayCellSummary[]>((resolve, reject) => {
    pending.set(id, {
      resolve: (val) => resolve(val as MonthDayCellSummary[]),
      reject,
    });
    const msg: WorkerRequest = { id, type: 'MONTH_SUMMARY', payload };
    w.postMessage(msg);
  });
}
