import { Pillar, sexagenaryToPillar, pillarToSexagenary } from '../ganzhi/pillars';
import { stemIsYang } from '../relations/elements';
import { getSolarTerms, SolarTermInstant } from '../time/solar-terms';
import { Gender } from '../directions/menh-quai';
import { mod } from '../time/jdn';

export interface LuckPillarCycle {
  index: number; // 1..8
  pillar: Pillar;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
}

export interface LuckCyclesResult {
  forward: boolean;
  directionNote: string;
  startAgeYears: number;
  daysToJie: number;
  cycles: LuckPillarCycle[];
}

function collectJieTermsAround(birthInstant: number): SolarTermInstant[] {
  const y = new Date(birthInstant).getUTCFullYear();
  const terms = [...getSolarTerms(y - 1), ...getSolarTerms(y), ...getSolarTerms(y + 1)];
  return terms.filter((t) => t.def.jie);
}

/**
 * Tính Đại vận 10 năm:
 * - Chiều thuận khi (Nam Dương niên) hoặc (Nữ Âm niên); nghịch khi (Nam Âm niên) hoặc (Nữ Dương niên).
 * - Nếu gender = 'khong_neu': cho phép truyền `customForward`, mặc định thuận và ghi chú rõ.
 * - Tuổi khởi vận = số ngày từ lúc sinh tới "tiết" kế tiếp (thuận) hoặc "tiết" trước đó (nghịch) chia 3 (làm tròn 1 chữ số thập phân, và tuổi nguyên tối thiểu 1).
 */
export function computeLuckCycles(
  birthInstant: number,
  baziYear: number,
  yearPillar: Pillar,
  monthPillar: Pillar,
  gender: Gender,
  customForward?: boolean,
): LuckCyclesResult {
  const yearYang = stemIsYang(yearPillar.stem);
  let forward: boolean;
  let directionNote: string;

  if (gender === 'nam') {
    forward = yearYang;
    directionNote = yearYang ? 'Dương nam — đại vận đi thuận' : 'Âm nam — đại vận đi nghịch';
  } else if (gender === 'nu') {
    forward = !yearYang;
    directionNote = !yearYang ? ' Âm nữ — đại vận đi thuận'.trim() : 'Dương nữ — đại vận đi nghịch';
  } else {
    forward = customForward ?? true;
    directionNote = `Chưa nêu giới tính — đang tính đại vận chiều ${forward ? 'thuận' : 'nghịch'} (có thể đổi).`;
  }

  const jies = collectJieTermsAround(birthInstant);
  let prevJie = jies[0];
  let nextJie = jies[jies.length - 1];
  for (let i = 0; i < jies.length; i++) {
    if (jies[i].instant <= birthInstant) prevJie = jies[i];
    if (jies[i].instant > birthInstant) {
      nextJie = jies[i];
      break;
    }
  }

  const diffMs = forward ? nextJie.instant - birthInstant : birthInstant - prevJie.instant;
  const daysToJie = Math.max(0, diffMs / 86_400_000);
  const startAgeYears = Math.max(1, Math.round(daysToJie / 3));

  const monthSexagenary = pillarToSexagenary(monthPillar);
  const step = forward ? 1 : -1;
  const cycles: LuckPillarCycle[] = [];
  for (let i = 1; i <= 8; i++) {
    const p = sexagenaryToPillar(mod(monthSexagenary + step * i, 60));
    const startAge = startAgeYears + (i - 1) * 10;
    const endAge = startAge + 9;
    const startYear = baziYear + startAge;
    const endYear = baziYear + endAge;
    cycles.push({
      index: i,
      pillar: p,
      startAge,
      endAge,
      startYear,
      endYear,
    });
  }

  return {
    forward,
    directionNote,
    startAgeYears,
    daysToJie: Math.round(daysToJie * 100) / 100,
    cycles,
  };
}

export function findActiveLuckCycle(
  luck: LuckCyclesResult,
  targetYear: number,
): LuckPillarCycle | undefined {
  return (
    luck.cycles.find((c) => targetYear >= c.startYear && targetYear <= c.endYear) ??
    luck.cycles[0]
  );
}
