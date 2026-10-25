import {
  elementControlledBy,
  elementControls,
  elementGeneratedBy,
  elementGenerates,
} from '../relations/elements';
import { ConfidenceLevel, ElementId } from '../types';
import { StrengthAnalysis } from './strength';

export interface ClimateAdjustment {
  season: 'dong_lanh' | 'ha_nong' | 'thu_kho' | 'xuan_am' | 'binh_hoa';
  preferredElement?: ElementId;
  note: string;
}

export interface UsefulGodAnalysis {
  /** Dụng thần chính */
  dungThan: ElementId;
  /** Hỷ thần (phụ trợ Dụng thần) */
  hyThan: ElementId;
  /** Kỵ thần chính */
  kyThan: ElementId;
  /** Cừu thần */
  cuuThan: ElementId;
  /** Nhàn thần */
  nhanThan: ElementId;
  /** Điều hậu (mùa sinh quá nóng/lạnh/khô/ẩm) */
  dieuHau: ClimateAdjustment;
  methodNote: string;
  confidence: ConfidenceLevel;
}

/** Điều hậu theo Chi tháng (Hợi-Tý-Sửu hàn → cần Hỏa; Tỵ-Ngọ-Mùi nhiệt → cần Thủy; Thân-Dậu-Tuất táo → cần Thủy/Mộc). */
export function evaluateClimate(monthBranch: number): ClimateAdjustment {
  if (monthBranch === 11 || monthBranch === 0 || monthBranch === 1) {
    return {
      season: 'dong_lanh',
      preferredElement: 'hoa',
      note: 'Sinh mùa đông hàn lạnh: Điều hậu ưu tiên hành Hỏa để sưởi ấm cục diện.',
    };
  }
  if (monthBranch === 5 || monthBranch === 6 || monthBranch === 7) {
    return {
      season: 'ha_nong',
      preferredElement: 'thuy',
      note: 'Sinh mùa hạ viêm nhiệt: Điều hậu ưu tiên hành Thủy để điều tiết khí nóng.',
    };
  }
  if (monthBranch === 8 || monthBranch === 9 || monthBranch === 10) {
    return {
      season: 'thu_kho',
      preferredElement: 'thuy',
      note: 'Sinh mùa thu khô ráo: Điều hậu ưu tiên Thủy润 (nhuận) kết hợp Mộc/Hỏa tùy cục.',
    };
  }
  return {
    season: 'xuan_am',
    note: 'Sinh mùa xuân khí hậu ôn hòa, ưu tiên Phù Ức làm trục chính.',
  };
}

/**
 * Xác định Dụng thần / Hỷ thần / Kỵ thần theo Phù Ức (mặc định) có hiệu chỉnh Điều hậu phụ.
 * - Thân vượng: cần tiết (Thực Thương = ta sinh), khắc (Quan Sát = khắc ta), hao (Tài = ta khắc).
 * - Thân nhược: cần sinh (Ấn = sinh ta), trợ (Tỷ Kiếp = cùng hành).
 */
export function selectUsefulGod(
  strength: StrengthAnalysis,
  monthBranch: number,
): UsefulGodAnalysis {
  const dm = strength.dayMasterElement;
  const anEl = elementGeneratedBy(dm); // sinh ta
  const tyEl = dm; // cùng hành
  const thucEl = elementGenerates(dm); // ta sinh
  const taiEl = elementControls(dm); // ta khắc
  const quanEl = elementControlledBy(dm); // khắc ta

  const dieuHau = evaluateClimate(monthBranch);
  const dist = strength.elementDistribution;

  let dungThan: ElementId;
  let hyThan: ElementId;
  let kyThan: ElementId;
  let cuuThan: ElementId;

  if (strength.isStrong) {
    // Vượng -> ức/tiết/hao: chọn giữa Quan, Thực, Tài (ưu tiên hành trùng Điều hậu hoặc đang thiếu vừa phải)
    const candidates: ElementId[] = [quanEl, thucEl, taiEl];
    if (dieuHau.preferredElement && candidates.includes(dieuHau.preferredElement)) {
      dungThan = dieuHau.preferredElement;
    } else {
      // Nếu Tỷ Kiếp quá nhiều, ưu tiên Quan Sát hoặc Thực Thương
      dungThan = dist[anEl] > dist[tyEl] ? taiEl : quanEl;
    }
    hyThan = dungThan === quanEl ? taiEl : dungThan === taiEl ? thucEl : taiEl;
    kyThan = anEl;
    cuuThan = tyEl;
  } else {
    // Nhược -> phù trợ: chọn giữa Ấn (sinh ta) và Tỷ Kiếp (trợ ta)
    if (dieuHau.preferredElement === anEl || dieuHau.preferredElement === tyEl) {
      dungThan = dieuHau.preferredElement;
    } else {
      // Nếu Quan Sát mạnh thì dùng Ấn hóa Sát; nếu Tài mạnh thì dùng Tỷ Kiếp
      dungThan = dist[quanEl] >= dist[taiEl] ? anEl : anEl;
    }
    hyThan = dungThan === anEl ? tyEl : anEl;
    kyThan = quanEl;
    cuuThan = taiEl;
  }

  const all: ElementId[] = ['kim', 'moc', 'thuy', 'hoa', 'tho'];
  const used = new Set<ElementId>([dungThan, hyThan, kyThan, cuuThan]);
  const nhanThan = all.find((e) => !used.has(e)) ?? thucEl;

  return {
    dungThan,
    hyThan,
    kyThan,
    cuuThan,
    nhanThan,
    dieuHau,
    methodNote:
      'Phương pháp Phù Ức kết hợp Điều hậu (đơn giản hóa để tham khảo, mức tin cậy B).',
    confidence: 'B',
  };
}

/** Phân loại một hành bất kỳ so với Dụng/Kỵ thần của lá số. */
export function classifyElementForUsefulGod(
  el: ElementId,
  ug: UsefulGodAnalysis,
): 'dung' | 'ky' | 'trung_tinh' {
  if (el === ug.dungThan || el === ug.hyThan) return 'dung';
  if (el === ug.kyThan || el === ug.cuuThan) return 'ky';
  return 'trung_tinh';
}
