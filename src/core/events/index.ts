import { BaziChart } from '../bazi/chart';
import { ENGINE_VERSION } from '../../constants';
import { buildDailyNarrative, DailyPredictionReport } from './narrator';
import { selectEventsForDay } from './selector';
import { generateSignals, SignalGenerationOptions } from './signals';

export function predictDayEvents(
  instant: number,
  chart: BaziChart | undefined,
  opts: SignalGenerationOptions,
  engineVersion: string = ENGINE_VERSION,
): DailyPredictionReport {
  const bundle = generateSignals(instant, chart, opts);
  const selection = selectEventsForDay(bundle);
  return buildDailyNarrative(bundle, selection, engineVersion);
}
