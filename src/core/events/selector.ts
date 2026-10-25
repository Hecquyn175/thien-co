import congViecData from '../../data/events/cong_viec.json';
import nguoiData from '../../data/events/nguoi.json';
import sucKhoeData from '../../data/events/suc_khoe_di_chuyen.json';
import tienBacData from '../../data/events/tien_bac.json';
import { EventGroup } from '../types';
import { buildExplainTree } from './explain';
import {
  computeIntensity,
  DEFAULT_SLOT_MULTIPLIERS,
  EventDefinition,
   ScoredEvent,
  scoreSingleEvent,
  SlotMultipliers,
} from './scorer';
import { SignalBundle } from './signals';

export const ALL_EVENT_DEFINITIONS: ReadonlyArray<EventDefinition> = [
  ...(nguoiData.events as unknown as EventDefinition[]),
  ...(tienBacData.events as unknown as EventDefinition[]),
  ...(congViecData.events as unknown as EventDefinition[]),
  ...(sucKhoeData.events as unknown as EventDefinition[]),
];

export const EVENT_GROUPS: ReadonlyArray<EventGroup> = [
  'nguoi',
  'tien_bac',
  'cong_viec',
  'suc_khoe_di_chuyen',
];

export interface ConflictPairNotice {
  eventAId: string;
  eventATitle: string;
  eventBId: string;
  eventBTitle: string;
}

export interface SelectionResult {
  byGroup: Record<EventGroup, ScoredEvent[]>;
  allSelected: ScoredEvent[];
  conflicts: ConflictPairNotice[];
}

/**
 * Chấm điểm, xử lý mâu thuẫn (`conflictsWith`: dampen / suppress),
 * chọn tối đa 3 sự kiện mỗi nhóm, tổng ≤ 10 trên toàn màn hình Hôm nay,
 * đồng thời đảm bảo mỗi nhóm có tối thiểu 1 sự kiện có tín hiệu hỗ trợ.
 */
export function selectEventsForDay(
  bundle: SignalBundle,
  slotMultipliers: SlotMultipliers = DEFAULT_SLOT_MULTIPLIERS,
): SelectionResult {
  // Bước 1: Chấm điểm tất cả sự kiện khớp điều kiện nghiêm ngặt
  const initialMap = new Map<string, ScoredEvent>();
  for (const def of ALL_EVENT_DEFINITIONS) {
    const s = scoreSingleEvent(def, bundle, slotMultipliers, false);
    if (s) initialMap.set(def.id, s);
  }

  // Đảm bảo mỗi nhóm có ít nhất 1 sự kiện (nếu nhóm nào chưa có sự kiện khớp chặt, cho phép hạ bậc về khớp trọng số tín hiệu trong nhóm đó)
  for (const g of EVENT_GROUPS) {
    const hasInGroup = Array.from(initialMap.values()).some((e) => e.def.group === g);
    if (!hasInGroup) {
      const candidates = ALL_EVENT_DEFINITIONS.filter((d) => d.group === g)
        .map((d) => scoreSingleEvent(d, bundle, slotMultipliers, true))
        .filter((x): x is ScoredEvent => x !== null)
        .sort((a, b) => b.score - a.score);
      if (candidates[0]) {
        initialMap.set(candidates[0].def.id, candidates[0]);
      }
    }
  }

  // Bước 2: Xử lý conflictsWith (dampen hoặc suppress)
  const suppressedIds = new Set<string>();
  const conflicts: ConflictPairNotice[] = [];
  const seenPairs = new Set<string>();

  for (const ev of initialMap.values()) {
    if (!ev.def.conflictsWith) continue;
    for (const cRule of ev.def.conflictsWith) {
      const other = initialMap.get(cRule.id);
      if (!other) continue;

      const pairKey = [ev.def.id, other.def.id].sort().join('||');
      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);
        conflicts.push({
          eventAId: ev.def.id,
          eventATitle: ev.def.title,
          eventBId: other.def.id,
          eventBTitle: other.def.title,
        });
      }

      if (cRule.mode === 'suppress') {
        if (other.rawScore > ev.rawScore) {
          suppressedIds.add(ev.def.id);
        }
      } else if (cRule.mode === 'dampen') {
        if (other.rawScore >= ev.rawScore) {
          const factor = cRule.factor ?? 0.65;
          ev.score = Math.round(ev.score * factor * 100) / 100;
          ev.intensity = computeIntensity(ev.score);
          ev.dampenedBy = [...(ev.dampenedBy ?? []), other.def.title];
        }
      }
    }
  }

  // Bước 3: Chọn tối đa 3 sự kiện mỗi nhóm
  const byGroup: Record<EventGroup, ScoredEvent[]> = {
    nguoi: [],
    tien_bac: [],
    cong_viec: [],
    suc_khoe_di_chuyen: [],
  };

  for (const g of EVENT_GROUPS) {
    const groupEvents = Array.from(initialMap.values())
      .filter((e) => e.def.group === g && !suppressedIds.has(e.def.id))
      .sort((a, b) => b.score - a.score || a.def.id.localeCompare(b.def.id));

    // Nếu suppress làm rỗng cả nhóm, giữ lại sự kiện điểm cao nhất của nhóm
    if (groupEvents.length === 0) {
      const fallback = Array.from(initialMap.values())
        .filter((e) => e.def.group === g)
        .sort((a, b) => b.score - a.score)[0];
      if (fallback) groupEvents.push(fallback);
    }

    byGroup[g] = groupEvents.slice(0, 3);
  }

  // Bước 4: Giới hạn tổng số sự kiện trên màn Hôm nay ≤ 10 (nhưng giữ ít nhất 1 sự kiện mỗi nhóm)
  let allSelected = EVENT_GROUPS.flatMap((g) => byGroup[g]);
  while (allSelected.length > 10) {
    // Tìm sự kiện điểm thấp nhất nằm ở nhóm có >= 2 sự kiện
    let lowest: ScoredEvent | undefined;
    for (const ev of allSelected) {
      if (byGroup[ev.def.group].length <= 1) continue;
      if (!lowest || ev.score < lowest.score) lowest = ev;
    }
    if (!lowest) break;
    byGroup[lowest.def.group] = byGroup[lowest.def.group].filter(
      (x) => x.def.id !== lowest!.def.id,
    );
    allSelected = EVENT_GROUPS.flatMap((g) => byGroup[g]);
  }

  // Bước 5: Dựng cây giải thích cho mọi sự kiện được chọn
  for (const ev of allSelected) {
    ev.explainTree = buildExplainTree(ev);
  }

  return {
    byGroup,
    allSelected,
    conflicts,
  };
}
