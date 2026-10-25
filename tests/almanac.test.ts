import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { computeDayAlmanac } from '../src/core/almanac/gio-dep';
import { getDayHoangDao, getHourHoangDao } from '../src/core/almanac/hoang-dao';
import { ALL_THAN_SAT_DEFS, evaluateThanSat } from '../src/core/almanac/than-sat';
import { getTrucForDay, TRUC_LIST } from '../src/core/almanac/truc';
import { getTu28ForJdn, TU28_LIST } from '../src/core/almanac/tu28';
import { getXuatHanhDirections } from '../src/core/almanac/xuat-hanh';
import { sexagenaryToPillar } from '../src/core/ganzhi/pillars';
import { jdnFromYMD, ymdFromJdn } from '../src/core/time/jdn';
import { fromLocalParts } from '../src/core/time/tz';

const require_ = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Solar } = require_('lunar-javascript') as any;

describe('Tầng Xem Ngày (Giai đoạn 4)', () => {
  it('12 Trực phủ đủ 12 mục và đối chiếu quy tắc Kiến Trừ', () => {
    expect(TRUC_LIST.length).toBe(12);
    // Tháng Dần (2) ngày Dần (2) -> Kiến (0)
    expect(getTrucForDay(2, 2).id).toBe('kien');
    // Tháng Dần (2) ngày Thân (8) -> Phá (6)
    expect(getTrucForDay(2, 8).id).toBe('pha');
  });

  it('28 Tú phủ đủ 28 sao và đối chiếu chéo với lunar-javascript trên 100 ngày mẫu', () => {
    expect(TU28_LIST.length).toBe(28);
    const start = jdnFromYMD(2000, 1, 1);
    const SIMPL_TO_TRAD: Record<string, string> = {
      虚: '虛',
      娄: '婁',
      昴: '昴',
      毕: '畢',
      参: '參',
      张: '張',
      轸: '軫',
    };
    for (let i = 0; i < 100; i++) {
      const j = start + i * 17;
      const { year, month, day } = ymdFromJdn(j);
      const libXiu: string = Solar.fromYmd(year, month, day).getLunar().getXiu();
      const expectedHan = SIMPL_TO_TRAD[libXiu] ?? libXiu;
      const mine = getTu28ForJdn(j);
      expect(mine.han, `${year}-${month}-${day}`).toBe(expectedHan);
    }
  });

  it('12 Hoàng/Hắc đạo có đúng 6 Hoàng đạo và 6 Hắc đạo mỗi ngày/giờ', () => {
    for (let mb = 0; mb < 12; mb++) {
      let hdCount = 0;
      for (let db = 0; db < 12; db++) {
        if (getDayHoangDao(mb, db).hoangDao) hdCount++;
      }
      expect(hdCount).toBe(6);
    }
    for (let db = 0; db < 12; db++) {
      let hdHours = 0;
      for (let hb = 0; hb < 12; hb++) {
        if (getHourHoangDao(db, hb).hoangDao) hdHours++;
      }
      expect(hdHours).toBe(6);
    }
  });

  it('Thần sát có tối thiểu 20 sao, mỗi sao có quy tắc và nguồn', () => {
    expect(ALL_THAN_SAT_DEFS.length).toBeGreaterThanOrEqual(20);
    for (const s of ALL_THAN_SAT_DEFS) {
      expect(s.ruleDesc.length).toBeGreaterThan(5);
      expect(s.source.length).toBeGreaterThan(2);
    }
    // Ngày mùng 5 âm lịch luôn có Nguyệt Kỵ
    const hits = evaluateThanSat(2, { stem: 0, branch: 2 }, { year: 2026, month: 1, day: 5, isLeapMonth: false });
    expect(hits.some((h) => h.id === 'nguyet_ky')).toBe(true);
  });

  it('Hướng xuất hành (Hỷ thần, Tài thần, Hạc thần) phủ đủ 60 Hoa Giáp', () => {
    for (let i = 0; i < 60; i++) {
      const p = sexagenaryToPillar(i);
      const xh = getXuatHanhDirections(p);
      expect(xh.hyThanVi.length).toBeGreaterThan(0);
      expect(xh.taiThanVi.length).toBeGreaterThan(0);
      expect(xh.hacThanVi.length).toBeGreaterThan(0);
    }
  });

  it('computeDayAlmanac trả về đầy đủ dữ liệu ngày, 12 canh giờ và Nên/Kỵ chuẩn hóa', () => {
    const inst = fromLocalParts(2026, 10, 25, 12, 0, 0, 420);
    const alm = computeDayAlmanac(inst, 420);
    expect(alm.hours.length).toBe(12);
    expect(alm.topHours.length).toBeGreaterThanOrEqual(3);
    expect(alm.truc.vi.length).toBeGreaterThan(0);
    expect(alm.tu28.vi.length).toBeGreaterThan(0);
  });
});
