import ganzhiData from '../../data/ganzhi.json';
import { computeDayAlmanac, DayAlmanac } from '../almanac/gio-dep';
import { getHourHoangDao } from '../almanac/hoang-dao';
import { BaziChart } from '../bazi/chart';
import { findActiveLuckCycle } from '../bazi/luck-cycles';
import { natalBranchSlot, PALACE_INFOS } from '../bazi/palaces';
import { classifyElementForUsefulGod } from '../bazi/useful-god';
import { computeFlyingStars, FullFlyingStarsSnapshot } from '../directions/flying-stars';
import { computeQimenBoard, QimenBoard } from '../directions/qimen';
import { getHiddenStems } from '../ganzhi/hidden-stems';
import { DEFAULT_ZI_CONVENTION, hourBranchFromHour, hourStemFor, ZiHourConvention } from '../ganzhi/hour-pillar';
import { fourPillars, FourPillars } from '../ganzhi/pillars';
import { getDailyHexagram, IChingCastResult } from '../iching/cast';
import { branchElement, stemElement } from '../relations/elements';
import { checkBranchPairRelations, checkStemRelation, checkTripleBranchRelations } from '../relations/stem-branch-relations';
import { getTenGod, TEN_GOD_META } from '../relations/ten-gods';
import { toLocalParts } from '../time/tz';
import { BaguaDir, Palace, Signal, TenGodId } from '../types';

export type FactMap = Record<string, string[]>;

export interface SignalGenerationOptions {
  tzOffsetMinutes: number;
  ziHourConvention?: ZiHourConvention;
  enableFlyingStars?: boolean;
  enableQimen?: boolean;
  enableDailyHexagram?: boolean;
}

export interface SignalBundle {
  instant: number;
  transit: FourPillars;
  almanac: DayAlmanac;
  chart?: BaziChart;
  flyingStars?: FullFlyingStarsSnapshot;
  qimen?: QimenBoard;
  dailyHexagram?: IChingCastResult;
  facts: FactMap;
  signals: Signal[];
  signalById: Map<string, Signal>;
}

const TEN_GOD_DEFAULT_TAGS: Record<TenGodId, string[]> = {
  chinh_an: ['nguoi', 'cong_viec', 'quy_nhan', 'giay_to', 'hoc_tap'],
  thien_an: ['cong_viec', 'hoc_tap', 'sang_tao', 'quy_nhan'],
  chinh_quan: ['cong_viec', 'nguoi', 'cap_tren', 'quy_cu'],
  that_sat: ['cong_viec', 'nguoi', 'ap_luc', 'canh_tranh'],
  chinh_tai: ['tien_bac', 'thu_nhap', 'on_dinh'],
  thien_tai: ['tien_bac', 'thu_ngoai_du_kien', 'co_hoi'],
  thuc_than: ['nguoi', 'suc_khoe_di_chuyen', 'sang_tao', 'thu_tha'],
  thuong_quan: ['nguoi', 'cong_viec', 'tranh_luan', 'y_tuong'],
  ty_kien: ['nguoi', 'cong_viec', 'dong_nghiep', 'hop_tac'],
  kiep_tai: ['tien_bac', 'nguoi', 'hao_tai', 'nho_va'],
};

function addFact(facts: FactMap, key: string, value: string): void {
  const arr = facts[key] ?? (facts[key] = []);
  if (!arr.includes(value)) arr.push(value);
}

function addSignal(
  list: Signal[],
  map: Map<string, Signal>,
  facts: FactMap,
  factKey: string,
  factValue: string,
  sig: Omit<Signal, 'id'>,
): void {
  addFact(facts, factKey, factValue);
  const id = `${factKey}.${factValue}`;
  const existing = map.get(id);
  if (!existing || sig.strength > existing.strength) {
    const full: Signal = { ...sig, id };
    map.set(id, full);
    if (!existing) list.push(full);
    else {
      const idx = list.findIndex((x) => x.id === id);
      if (idx >= 0) list[idx] = full;
    }
  }
}

/** Tìm các canh giờ (0..11) trong ngày mà Can giờ tạo ra `targetTenGod` hoặc Chi giờ hợp/xung. */
function findHourWindowsForTenGod(dayStem: number, dmStem: number, tg: TenGodId): number[] {
  const out: number[] = [];
  for (let hb = 0; hb < 12; hb++) {
    const hs = hourStemFor(dayStem, hb);
    if (getTenGod(dmStem, hs) === tg) out.push(hb);
  }
  return out;
}

export function generateSignals(
  instant: number,
  chart: BaziChart | undefined,
  opts: SignalGenerationOptions,
): SignalBundle {
  const conv = opts.ziHourConvention ?? DEFAULT_ZI_CONVENTION;
  const transit = fourPillars(instant, {
    tzOffsetMinutes: opts.tzOffsetMinutes,
    ziHourConvention: conv,
  });
  const almanac = computeDayAlmanac(instant, opts.tzOffsetMinutes, chart);
  const parts = toLocalParts(instant, opts.tzOffsetMinutes);
  const curHourBranch = hourBranchFromHour(parts.hour);

  const facts: FactMap = {};
  const signals: Signal[] = [];
  const signalById = new Map<string, Signal>();

  // Helper xác định chiều thuận/nghịch theo Dụng thần (nếu có lá số)
  const elementValence = (el: ReturnType<typeof stemElement>, defaultVal = 0.2): number => {
    if (!chart) return defaultVal;
    const cl = classifyElementForUsefulGod(el, chart.usefulGod);
    return cl === 'dung' ? 0.75 : cl === 'ky' ? -0.75 : 0.1;
  };

  // --- 1. NỀN CHUNG (ALMANAC & THẦN SÁT) ---
  const hdVal = almanac.isHoangDaoDay ? 'hoang_dao' : 'hac_dao';
  addSignal(signals, signalById, facts, 'almanac.hoang_dao', hdVal, {
    layer: 'almanac',
    strength: 0.55,
    valence: almanac.isHoangDaoDay ? 0.5 : -0.4,
    tags: ['almanac', hdVal],
    explain: {
      ruleId: `almanac.hoang_dao.${hdVal}`,
      summary: `Ngày ${almanac.hoangDaoDeity.vi} (${almanac.isHoangDaoDay ? 'Hoàng đạo' : 'Hắc đạo'}): ${almanac.hoangDaoDeity.summary}`,
      source: 'Hiệp Kỷ Biện Phương Thư',
      confidence: 'A',
    },
  });

  const hourDeity = getHourHoangDao(almanac.dayPillar.branch, curHourBranch);
  const hhdVal = hourDeity.hoangDao ? 'hoang_dao' : 'hac_dao';
  addSignal(signals, signalById, facts, 'almanac.hour_hoang_dao', hhdVal, {
    layer: 'almanac',
    strength: 0.45,
    valence: hourDeity.hoangDao ? 0.45 : -0.35,
    window: [curHourBranch],
    tags: ['almanac', hhdVal],
    explain: {
      ruleId: `almanac.hour_hoang_dao.${hhdVal}`,
      summary: `Giờ ${ganzhiData.branches[curHourBranch].vi} gặp sao ${hourDeity.vi} (${hourDeity.hoangDao ? 'Hoàng đạo' : 'Hắc đạo'}).`,
      source: 'Hiệp Kỷ Biện Phương Thư',
      confidence: 'A',
    },
  });

  const trucValence =
    almanac.truc.rating === 'cat' ? 0.6 : almanac.truc.rating === 'hung' ? -0.6 : 0.05;
  addSignal(signals, signalById, facts, 'almanac.truc', almanac.truc.id, {
    layer: 'almanac',
    strength: 0.6,
    valence: trucValence,
    tags: ['almanac', 'truc'],
    explain: {
      ruleId: `almanac.truc.${almanac.truc.id}`,
      summary: `Trực ${almanac.truc.vi}: ${almanac.truc.summary}`,
      source: almanac.truc.source,
      confidence: almanac.truc.confidence,
    },
  });

  const tuValence =
    almanac.tu28.rating === 'cat' ? 0.45 : almanac.tu28.rating === 'hung' ? -0.45 : 0.05;
  addSignal(signals, signalById, facts, 'almanac.tu28_rating', almanac.tu28.rating, {
    layer: 'almanac',
    strength: 0.45,
    valence: tuValence,
    tags: ['almanac', 'tu28'],
    explain: {
      ruleId: `almanac.tu28.${almanac.tu28.id}`,
      summary: `Nhị thập bát tú: Sao ${almanac.tu28.fullVi} (${almanac.tu28.rating === 'cat' ? 'Cát' : almanac.tu28.rating === 'hung' ? 'Hung' : 'Bình'}) — ${almanac.tu28.summary}`,
      source: almanac.tu28.source,
      confidence: almanac.tu28.confidence,
    },
  });

  // Đưa cả thần Hoàng/Hắc đạo của ngày vào than_sat để khớp với các rule tham chiếu trực tiếp (vd than_sat.thanh_long)
  addSignal(signals, signalById, facts, 'than_sat', almanac.hoangDaoDeity.id, {
    layer: 'than_sat',
    strength: 0.5,
    valence: almanac.hoangDaoDeity.hoangDao ? 0.55 : -0.5,
    tags: ['than_sat'],
    explain: {
      ruleId: `than_sat.${almanac.hoangDaoDeity.id}`,
      summary: `Thần ngày ${almanac.hoangDaoDeity.vi}: ${almanac.hoangDaoDeity.summary}`,
      source: 'Hiệp Kỷ Biện Phương Thư',
      confidence: 'A',
    },
  });

  for (const ts of almanac.thanSat) {
    addSignal(signals, signalById, facts, 'than_sat', ts.id, {
      layer: 'than_sat',
      strength: 0.55,
      valence: ts.nature === 'cat' ? 0.6 : -0.6,
      tags: ['than_sat', ts.nature],
      explain: {
        ruleId: `than_sat.${ts.id}`,
        summary: `Sao ${ts.vi} (${ts.nature === 'cat' ? 'Cát tinh' : 'Hung tinh'}): ${ts.summary}`,
        source: ts.source,
        confidence: ts.confidence,
      },
    });
  }

  // --- 2. CÁ NHÂN HÓA (BÁT TỰ: DỤNG THẦN, THẬP THẦN, QUAN HỆ CAN CHI, ĐẠI VẬN) ---
  if (chart) {
    const dm = chart.dayMasterStem;
    const hourKnownFactor = chart.birthTimeKnown ? 1.0 : 0.65;

    // 2a. Dụng thần / Kỵ thần theo hành của ngày/giờ/tháng/năm
    const slotElements: Array<[string, number, string, number]> = [
      ['day_element', transit.day.stem, 'Ngày', 0.85],
      ['hour_element', transit.hour.stem, 'Giờ', 0.65 * hourKnownFactor],
      ['month_element', transit.month.stem, 'Tháng', 0.5],
      ['year_element', transit.year.stem, 'Năm', 0.4],
    ];
    for (const [slotKey, stemIdx, labelVi, str] of slotElements) {
      const el = stemElement(stemIdx);
      const cls = classifyElementForUsefulGod(el, chart.usefulGod);
      const val = cls === 'dung' ? 0.85 : cls === 'ky' ? -0.8 : 0.1;
      addSignal(signals, signalById, facts, `useful_god.${slotKey}`, cls, {
        layer: 'useful_god',
        strength: str,
        valence: val,
        tags: ['useful_god', cls],
        explain: {
          ruleId: `useful_god.${slotKey}.${cls}`,
          summary: `Hành của Can ${labelVi} (${ganzhiData.stems[stemIdx].vi}) thuộc nhóm ${cls === 'dung' ? 'Dụng/Hỷ thần (nâng đỡ)' : cls === 'ky' ? 'Kỵ/Cừu thần (cần tiết chế)' : 'Nhàn thần (trung tính)'} của lá số.`,
          source: chart.usefulGod.methodNote,
          confidence: 'B',
        },
      });
    }

    // 2b. Thập thần của Can và Chi (kể cả tàng can) ngày / giờ / tháng / năm
    const stemSlots: Array<['day_stem' | 'hour_stem' | 'month_stem' | 'year_stem', number, string, number]> = [
      ['day_stem', transit.day.stem, 'Can ngày', 0.9],
      ['hour_stem', transit.hour.stem, 'Can giờ', 0.7 * hourKnownFactor],
      ['month_stem', transit.month.stem, 'Can tháng', 0.55],
      ['year_stem', transit.year.stem, 'Can năm', 0.45],
    ];

    for (const [slotKey, stemIdx, slotVi, baseStr] of stemSlots) {
      const tg = getTenGod(dm, stemIdx);
      const tgMeta = TEN_GOD_META[tg];
      const baseVal = elementValence(stemElement(stemIdx), tg === 'that_sat' || tg === 'kiep_tai' || tg === 'thuong_quan' ? -0.35 : 0.4);
      const win = findHourWindowsForTenGod(transit.day.stem, dm, tg);
      addSignal(signals, signalById, facts, `ten_god.${slotKey}`, tg, {
        layer: 'ten_god',
        strength: baseStr,
        valence: baseVal,
        window: win.length ? win : undefined,
        tags: TEN_GOD_DEFAULT_TAGS[tg],
        explain: {
          ruleId: `ten_god.${slotKey}.${tg}`,
          summary: `${slotVi} ${ganzhiData.stems[stemIdx].vi} là ${tgMeta.vi} (${tgMeta.han}) so với Nhật chủ ${ganzhiData.stems[dm].vi}.`,
          source: 'Tam Mệnh Thông Hội — Thập thần',
          confidence: 'A',
        },
      });
    }

    const branchSlots: Array<['day_branch' | 'hour_branch' | 'month_branch' | 'year_branch', number, string, number]> = [
      ['day_branch', transit.day.branch, 'Chi ngày', 0.85],
      ['hour_branch', transit.hour.branch, 'Chi giờ', 0.65 * hourKnownFactor],
      ['month_branch', transit.month.branch, 'Chi tháng', 0.5],
      ['year_branch', transit.year.branch, 'Chi năm', 0.4],
    ];

    for (const [slotKey, branchIdx, slotVi, baseStr] of branchSlots) {
      for (const hs of getHiddenStems(branchIdx)) {
        const tg = getTenGod(dm, hs.stem);
        const tgMeta = TEN_GOD_META[tg];
        const baseVal = elementValence(stemElement(hs.stem), tg === 'that_sat' || tg === 'kiep_tai' ? -0.3 : 0.35);
        addSignal(signals, signalById, facts, `ten_god.${slotKey}`, tg, {
          layer: 'ten_god',
          strength: Math.max(0.25, baseStr * hs.weight),
          valence: baseVal,
          tags: TEN_GOD_DEFAULT_TAGS[tg],
          explain: {
            ruleId: `ten_god.${slotKey}.${tg}`,
            summary: `${slotVi} ${ganzhiData.branches[branchIdx].vi} tàng ${ganzhiData.stems[hs.stem].vi} (${tgMeta.vi}, tỷ trọng ${Math.round(hs.weight * 100)}%).`,
            source: 'Tam Mệnh Thông Hội — Tàng can & Thập thần',
            confidence: 'B',
          },
        });
      }
    }

    // 2c. Quan hệ Can của ngày/giờ/tháng/năm với Nhật chủ và các Can trong lá số
    const natalStems: Array<[string, number, string]> = [
      ['nhat_chu', chart.day.pillar.stem, 'Nhật chủ'],
      ['nguyet_can', chart.month.pillar.stem, 'Can tháng sinh'],
      ['nien_can', chart.year.pillar.stem, 'Can năm sinh'],
    ];
    if (chart.hour) natalStems.push(['gio_can', chart.hour.pillar.stem, 'Can giờ sinh']);

    for (const [slotKey, tStem, tLabel] of stemSlots) {
      for (const [nKey, nStem, nLabel] of natalStems) {
        for (const hit of checkStemRelation(tStem, nStem)) {
          if (hit.type === 'ngu_hop') {
            const valName = `hop_${nKey}`;
            addSignal(signals, signalById, facts, `stem_relation.${slotKey}`, valName, {
              layer: 'stem_relation',
              strength: 0.75,
              valence: 0.65,
              tags: ['nguoi', 'hop_tac'],
              explain: {
                ruleId: `stem_relation.${slotKey}.${valName}`,
                summary: `${tLabel} ${ganzhiData.stems[tStem].vi} Ngũ hợp với ${nLabel} ${ganzhiData.stems[nStem].vi}.`,
                source: 'Tam Mệnh Thông Hội — Thiên can ngũ hợp',
                confidence: 'A',
              },
            });
          } else if (hit.type === 'tuong_xung' && nKey === 'nhat_chu') {
            addSignal(signals, signalById, facts, `stem_relation.${slotKey}`, 'xung_nhat_chu', {
              layer: 'stem_relation',
              strength: 0.75,
              valence: -0.65,
              tags: ['cong_viec', 'ap_luc'],
              explain: {
                ruleId: `stem_relation.${slotKey}.xung_nhat_chu`,
                summary: `${tLabel} ${ganzhiData.stems[tStem].vi} tương xung trực tiếp với Nhật chủ ${ganzhiData.stems[nStem].vi}.`,
                source: 'Tam Mệnh Thông Hội — Thiên can tương xung',
                confidence: 'A',
              },
            });
          }
        }
      }
    }

    // 2d. Quan hệ Chi của ngày/giờ/tháng/năm với 4 Chi lá số (gắn Cung vị)
    const natalBranches: Array<[natalBranchSlot, number]> = [
      ['nhat_chi', chart.day.pillar.branch],
      ['nguyet_chi', chart.month.pillar.branch],
      ['nien_chi', chart.year.pillar.branch],
    ];
    if (chart.hour) natalBranches.push(['gio_chi', chart.hour.pillar.branch]);

    const allNatalBranchNums = natalBranches.map(([, b]) => b);

    for (const [slotKey, tBranch, tLabel, baseStr] of branchSlots) {
      for (const [nSlot, nBranch] of natalBranches) {
        const palaceInfo = PALACE_INFOS[nSlot];
        const palace: Palace = palaceInfo.id;
        const pairHits = checkBranchPairRelations(tBranch, nBranch);

        for (const h of pairHits) {
          const relPrefix = h.type === 'luc_xung' ? 'xung' : h.type;
          const valName = `${relPrefix}_${nSlot}`;
          const isHarmony = h.type === 'luc_hop' || h.type === 'ban_tam_hop';
          const valence = isHarmony ? 0.7 : h.type === 'luc_xung' ? -0.75 : -0.55;
          const relVi =
            h.type === 'luc_hop'
              ? 'Lục hợp'
              : h.type === 'ban_tam_hop'
                ? 'Bán tam hợp'
                : h.type === 'luc_xung'
                  ? 'Lục xung'
                  : h.type === 'hinh'
                    ? 'Tương hình'
                    : h.type === 'hai'
                      ? 'Tương hại'
                      : 'Tương phá';

          // Tìm canh giờ kích hoạt cùng Chi hoặc xung Chi
          const win = [tBranch, (nBranch + 6) % 12];

          addSignal(signals, signalById, facts, `branch_relation.${slotKey}`, valName, {
            layer: 'branch_relation',
            strength: nSlot === 'gio_chi' ? baseStr * hourKnownFactor : baseStr,
            valence,
            palace,
            window: win,
            tags: ['branch_relation', relPrefix, palace],
            explain: {
              ruleId: `branch_relation.${slotKey}.${valName}`,
              summary: `${tLabel} ${ganzhiData.branches[tBranch].vi} ${relVi} với ${palaceInfo.pillarVi} ${ganzhiData.branches[nBranch].vi} (Cung ${palaceInfo.vi}: ${palaceInfo.domains}).`,
              source: 'Tam Mệnh Thông Hội — Địa chi sinh khắc & Cung vị',
              confidence: 'A',
            },
          });
        }

        // Kiểm Tam hợp đầy đủ
        const triples = checkTripleBranchRelations([...allNatalBranchNums, tBranch]);
        for (const tr of triples) {
          if (tr.type === 'tam_hop' && tr.branches.includes(tBranch) && tr.branches.includes(nBranch)) {
            const valName = `tam_hop_${nSlot}`;
            addSignal(signals, signalById, facts, `branch_relation.${slotKey}`, valName, {
              layer: 'branch_relation',
              strength: baseStr * 0.95,
              valence: 0.8,
              palace,
              tags: ['branch_relation', 'tam_hop', palace],
              explain: {
                ruleId: `branch_relation.${slotKey}.${valName}`,
                summary: `${tLabel} ${ganzhiData.branches[tBranch].vi} hội đủ bộ Tam hợp với ${palaceInfo.pillarVi} (Cung ${palaceInfo.vi}).`,
                source: 'Tam Mệnh Thông Hội — Địa chi Tam hợp',
                confidence: 'A',
              },
            });
          }
        }
      }
    }

    // 2e. Đại vận / Lưu niên / Lưu nguyệt
    const activeLuck = findActiveLuckCycle(chart.luckCycles, transit.baziYear);
    if (activeLuck) {
      const luckStemTg = getTenGod(dm, activeLuck.pillar.stem);
      addSignal(signals, signalById, facts, 'ten_god.luck_stem', luckStemTg, {
        layer: 'luck_cycle',
        strength: 0.35,
        valence: elementValence(stemElement(activeLuck.pillar.stem), 0.2),
        tags: ['luck_cycle'],
        explain: {
          ruleId: `ten_god.luck_stem.${luckStemTg}`,
          summary: `Đại vận hiện tại (${ganzhiData.stems[activeLuck.pillar.stem].vi} ${ganzhiData.branches[activeLuck.pillar.branch].vi}, ${activeLuck.startAge}–${activeLuck.endAge} tuổi) mang khí ${TEN_GOD_META[luckStemTg].vi}.`,
          source: 'Tử Bình Chân Thuyên — Đại vận',
          confidence: 'B',
        },
      });
      const daiVanCls = classifyElementForUsefulGod(
        branchElement(activeLuck.pillar.branch),
        chart.usefulGod,
      );
      addSignal(signals, signalById, facts, 'luck_cycle.dai_van', daiVanCls, {
        layer: 'luck_cycle',
        strength: 0.35,
        valence: daiVanCls === 'dung' ? 0.55 : daiVanCls === 'ky' ? -0.55 : 0.1,
        tags: ['luck_cycle', daiVanCls],
        explain: {
          ruleId: `luck_cycle.dai_van.${daiVanCls}`,
          summary: `Chi Đại vận (${ganzhiData.branches[activeLuck.pillar.branch].vi}) thuộc nhóm ${daiVanCls === 'dung' ? 'Dụng/Hỷ thần' : daiVanCls === 'ky' ? 'Kỵ thần' : 'Trung tính'}.`,
          source: 'Tử Bình Chân Thuyên',
          confidence: 'B',
        },
      });
    }

    const luuNienCls = classifyElementForUsefulGod(
      branchElement(transit.year.branch),
      chart.usefulGod,
    );
    addSignal(signals, signalById, facts, 'luck_cycle.luu_nien', luuNienCls, {
      layer: 'luck_cycle',
      strength: 0.3,
      valence: luuNienCls === 'dung' ? 0.5 : luuNienCls === 'ky' ? -0.5 : 0.1,
      tags: ['luck_cycle', luuNienCls],
      explain: {
        ruleId: `luck_cycle.luu_nien.${luuNienCls}`,
        summary: `Lưu niên ${ganzhiData.stems[transit.year.stem].vi} ${ganzhiData.branches[transit.year.branch].vi} thuộc nhóm ${luuNienCls === 'dung' ? 'Dụng/Hỷ thần' : luuNienCls === 'ky' ? 'Kỵ thần' : 'Trung tính'}.`,
        source: 'Tử Bình Chân Thuyên',
        confidence: 'B',
      },
    });

    const luuNguyetCls = classifyElementForUsefulGod(
      branchElement(transit.month.branch),
      chart.usefulGod,
    );
    addSignal(signals, signalById, facts, 'luck_cycle.luu_nguyet', luuNguyetCls, {
      layer: 'luck_cycle',
      strength: 0.4,
      valence: luuNguyetCls === 'dung' ? 0.55 : luuNguyetCls === 'ky' ? -0.55 : 0.1,
      tags: ['luck_cycle', luuNguyetCls],
      explain: {
        ruleId: `luck_cycle.luu_nguyet.${luuNguyetCls}`,
        summary: `Lưu nguyệt ${ganzhiData.stems[transit.month.stem].vi} ${ganzhiData.branches[transit.month.branch].vi} thuộc nhóm ${luuNguyetCls === 'dung' ? 'Dụng/Hỷ thần' : luuNguyetCls === 'ky' ? 'Kỵ thần' : 'Trung tính'}.`,
        source: 'Tử Bình Chân Thuyên',
        confidence: 'B',
      },
    });
  } else {
    // --- CHẾ ĐỘ KHÔNG HỒ SƠ (NỀN CHUNG) ---
    // Tạo các tín hiệu xu hướng chung từ quan hệ giữa Can/Chi ngày với Can/Chi tháng để 4 nhóm sự kiện đều có thể kích hoạt
    const pseudoDm = transit.month.stem;
    const dayTg = getTenGod(pseudoDm, transit.day.stem);
    const hourTg = getTenGod(pseudoDm, transit.hour.stem);
    addSignal(signals, signalById, facts, 'ten_god.day_stem', dayTg, {
      layer: 'ten_god',
      strength: 0.65,
      valence: almanac.isHoangDaoDay ? 0.45 : -0.25,
      tags: TEN_GOD_DEFAULT_TAGS[dayTg],
      explain: {
        ruleId: `ten_god.day_stem.${dayTg}.general`,
        summary: `(Chế độ nền chung) Can ngày ${ganzhiData.stems[transit.day.stem].vi} mang tượng ${TEN_GOD_META[dayTg].vi} so với Can tháng ${ganzhiData.stems[pseudoDm].vi}.`,
        source: 'Tương quan Can ngày – Can tháng (nền chung)',
        confidence: 'B',
      },
    });
    addSignal(signals, signalById, facts, 'ten_god.hour_stem', hourTg, {
      layer: 'ten_god',
      strength: 0.5,
      valence: 0.25,
      window: [curHourBranch],
      tags: TEN_GOD_DEFAULT_TAGS[hourTg],
      explain: {
        ruleId: `ten_god.hour_stem.${hourTg}.general`,
        summary: `(Chế độ nền chung) Can giờ ${ganzhiData.stems[transit.hour.stem].vi} mang tượng ${TEN_GOD_META[hourTg].vi}.`,
        source: 'Tương quan Can giờ – Can tháng (nền chung)',
        confidence: 'B',
      },
    });
    for (const hs of getHiddenStems(transit.day.branch)) {
      const bTg = getTenGod(pseudoDm, hs.stem);
      addSignal(signals, signalById, facts, 'ten_god.day_branch', bTg, {
        layer: 'ten_god',
        strength: 0.55 * hs.weight,
        valence: almanac.isHoangDaoDay ? 0.35 : -0.2,
        tags: TEN_GOD_DEFAULT_TAGS[bTg],
        explain: {
          ruleId: `ten_god.day_branch.${bTg}.general`,
          summary: `(Chế độ nền chung) Chi ngày tàng ${ganzhiData.stems[hs.stem].vi} (${TEN_GOD_META[bTg].vi}).`,
          source: 'Tàng can Chi ngày (nền chung)',
          confidence: 'B',
        },
      });
    }
    const genCls = almanac.isHoangDaoDay ? 'dung' : almanac.truc.rating === 'hung' ? 'ky' : 'trung_tinh';
    addSignal(signals, signalById, facts, 'useful_god.day_element', genCls, {
      layer: 'useful_god',
      strength: 0.5,
      valence: genCls === 'dung' ? 0.5 : genCls === 'ky' ? -0.5 : 0.1,
      tags: ['useful_god', genCls],
      explain: {
        ruleId: `useful_god.day_element.${genCls}.general`,
        summary: `(Chế độ nền chung) Khí ngày được ước lượng theo Hoàng đạo / Trực (${almanac.truc.vi}).`,
        source: 'Nền chung xem ngày Việt Nam',
        confidence: 'B',
      },
    });
  }

  // --- 3. LỚP HƯỚNG: PHI TINH (NẾU BẬT) ---
  let flyingStars: FullFlyingStarsSnapshot | undefined;
  if (opts.enableFlyingStars !== false) {
    try {
      flyingStars = computeFlyingStars(instant, opts.tzOffsetMinutes);
      const ds = flyingStars.day.centerMeta;
      addSignal(signals, signalById, facts, 'flying_star.day_star', String(ds.number), {
        layer: 'flying_star',
        strength: 0.45,
        valence: ds.nature === 'cat' ? 0.5 : -0.45,
        tags: ds.tags,
        explain: {
          ruleId: `flying_star.day_star.${ds.number}`,
          summary: `Phi tinh ngày: sao ${ds.vi} nhập Trung cung (${ds.summary})`,
          source: 'Lạc Thư Cửu Tinh',
          confidence: 'B',
        },
      });
    } catch {
      // Lỗi ở lớp hướng không được làm hỏng engine
    }
  }

  // --- 4. LỚP HƯỚNG: KỲ MÔN ĐỘN GIÁP (NẾU BẬT) ---
  let qimen: QimenBoard | undefined;
  if (opts.enableQimen !== false) {
    try {
      qimen = computeQimenBoard(instant, opts.tzOffsetMinutes, conv);
      addSignal(signals, signalById, facts, 'qimen.hour_overall', qimen.overallRating, {
        layer: 'qimen',
        strength: 0.4,
        valence: qimen.overallRating === 'cat' ? 0.45 : qimen.overallRating === 'hung' ? -0.4 : 0.1,
        window: [curHourBranch],
        tags: ['qimen', qimen.overallRating],
        explain: {
          ruleId: `qimen.hour_overall.${qimen.overallRating}`,
          summary: `Kỳ Môn thời gia (${qimen.duongDon ? 'Dương' : 'Âm'} độn cục ${qimen.juNumber}, ${qimen.yuanVi}): trạng thái chung ${qimen.overallRating.toUpperCase()}.`,
          source: qimen.methodLabelVi,
          confidence: 'C',
        },
      });

      for (const pState of Object.values(qimen.byDirection)) {
        const dId = pState.door.id;
        addSignal(signals, signalById, facts, 'qimen.hour_doors', dId, {
          layer: 'qimen',
          strength: 0.4,
          valence: pState.door.rating === 'cat' ? 0.5 : pState.door.rating === 'hung' ? -0.45 : 0.05,
          direction: pState.direction as BaguaDir,
          window: [curHourBranch],
          tags: ['qimen', dId],
          explain: {
            ruleId: `qimen.hour_doors.${dId}`,
            summary: `${pState.summary}`,
            source: qimen.methodLabelVi,
            confidence: 'C',
          },
        });
      }
    } catch {
      // Lỗi ở lớp Kỳ Môn không được làm hỏng engine
    }
  }

  // --- 5. QUẺ CỦA NGÀY (KINH DỊCH) ---
  let dailyHexagram: IChingCastResult | undefined;
  if (opts.enableDailyHexagram !== false) {
    dailyHexagram = getDailyHexagram(
      instant,
      opts.tzOffsetMinutes,
      chart?.profileId ?? 'no_profile',
    );
    const hn = dailyHexagram.primary.nature;
    addSignal(signals, signalById, facts, 'iching.day_hexagram_nature', hn, {
      layer: 'iching',
      strength: 0.35,
      valence: hn === 'cat' ? 0.45 : hn === 'hung' ? -0.4 : 0.1,
      tags: ['iching', hn],
      explain: {
        ruleId: `iching.day_hexagram_nature.${hn}`,
        summary: `Quẻ của ngày: #${dailyHexagram.primary.number} ${dailyHexagram.primary.vi} (${dailyHexagram.primary.han}) — ${dailyHexagram.primary.judgement}`,
        source: dailyHexagram.primary.source,
        confidence: 'B',
      },
    });
  }

  return {
    instant,
    transit,
    almanac,
    chart,
    flyingStars,
    qimen,
    dailyHexagram,
    facts,
    signals,
    signalById,
  };
}
