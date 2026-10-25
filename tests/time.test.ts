import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { jdnFromYMD, ymdFromJdn } from '../src/core/time/jdn';
import { fromLocalParts, localJdn, toLocalParts } from '../src/core/time/tz';
import { currentSolarTerm, getSolarTerms } from '../src/core/time/solar-terms';
import {
  jdnToLunar,
  lunarToSolarVN,
  solarToLunarVN,
  getLunarTable,
} from '../src/core/time/lunar-vn';
import {
  dayPillarFromJdn,
  fourPillars,
  pillarToSexagenary,
  yearPillarFromYear,
} from '../src/core/ganzhi/pillars';
import ganzhi from '../src/data/ganzhi.json';

const require_ = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Solar } = require_('lunar-javascript') as any;

const GAN = ganzhi.stems.map((s) => s.han);
const ZHI = ganzhi.branches.map((b) => b.han);
const gz = (p: { stem: number; branch: number }) => GAN[p.stem] + ZHI[p.branch];
const toSimplifiedGZ = (s: string) => s; // Can Chi: ký tự Hán dùng chung ở dạng phồn/giản như nhau
void toSimplifiedGZ;

const FIRST = jdnFromYMD(1900, 1, 1);
const LAST = jdnFromYMD(2100, 12, 31);

describe('JDN', () => {
  it('2000-01-01 = JDN 2451545', () => {
    expect(jdnFromYMD(2000, 1, 1)).toBe(2451545);
  });
  it('JDN <-> ngày dương khứ hồi 1800..2200', () => {
    for (let j = jdnFromYMD(1800, 1, 1); j <= jdnFromYMD(2200, 12, 31); j++) {
      const { year, month, day } = ymdFromJdn(j);
      expect(jdnFromYMD(year, month, day)).toBe(j);
    }
  });
  it('tz: toLocalParts/fromLocalParts khứ hồi', () => {
    const t = fromLocalParts(2026, 2, 4, 3, 45, 10, 420);
    const p = toLocalParts(t, 420);
    expect([p.year, p.month, p.day, p.hour, p.minute, p.second]).toEqual([2026, 2, 4, 3, 45, 10]);
    expect(localJdn(t, 420)).toBe(jdnFromYMD(2026, 2, 4));
    // cùng instant, múi giờ khác -> ngày có thể khác
    expect(toLocalParts(fromLocalParts(2026, 1, 1, 23, 30, 0, 420), 0).day).toBe(1);
  });
});

describe('Can Chi cơ bản', () => {
  it('2000-01-01 là Mậu Ngọ', () => {
    expect(gz(dayPillarFromJdn(2451545))).toBe('戊午');
  });
  it('năm 2026 là Bính Ngọ', () => {
    expect(gz(yearPillarFromYear(2026))).toBe('丙午');
  });
  it('chu kỳ ngày đúng 60, liên tục tăng 1', () => {
    let prev = pillarToSexagenary(dayPillarFromJdn(FIRST));
    expect(prev).toBeGreaterThanOrEqual(0);
    for (let j = FIRST + 1; j <= LAST; j++) {
      const cur = pillarToSexagenary(dayPillarFromJdn(j));
      expect(cur).toBe((prev + 1) % 60);
      prev = cur;
    }
    expect(dayPillarFromJdn(FIRST + 60)).toEqual(dayPillarFromJdn(FIRST));
  });
});

describe('Tiết khí: đối chiếu lunar-javascript (<= 2 phút, theo thời điểm vật lý)', () => {
  const NAMES = [
    '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种',
    '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪',
    '大雪', 'DONG_ZHI',
  ];
  it('24 tiết khí mỗi năm 1900-2100', () => {
    let maxDev = 0;
    let worst = '';
    for (let y = 1900; y <= 2100; y++) {
      const table = Solar.fromYmd(y, 6, 15).getLunar().getJieQiTable();
      const mine = getSolarTerms(y);
      for (let i = 0; i < 24; i++) {
        const s = table[NAMES[i]];
        const ref =
          Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond()) -
          8 * 3600_000; // thư viện dùng giờ Bắc Kinh
        const dev = Math.abs(mine[i].instant - ref);
        if (dev > maxDev) {
          maxDev = dev;
          worst = `${y} ${NAMES[i]}`;
        }
        expect(dev, `${y} ${NAMES[i]}`).toBeLessThanOrEqual(120_000);
      }
    }
    console.log(`[tiết khí] độ lệch lớn nhất so với lunar-javascript: ${(maxDev / 1000).toFixed(1)} giây (${worst})`);
  });
});

describe('Can Chi ngày/tháng/năm: đối chiếu lunar-javascript 1900-2100', () => {
  it('mọi ngày: Can Chi ngày, tháng, năm (00:00, 12:00, 22:30 giờ Bắc Kinh)', () => {
    const TZ = 480;
    let checked = 0;
    for (let j = FIRST; j <= LAST; j++) {
      const { year, month, day } = ymdFromJdn(j);
      for (const [h, mi] of [[0, 5], [12, 0], [22, 30]] as const) {
        const inst = fromLocalParts(year, month, day, h, mi, 0, TZ);
        // bỏ qua mẫu nằm sát thời điểm tiết (sai số thư viện ≤ 2 phút) — đã có test riêng ±5 phút
        const near = getSolarTerms(year).some((t) => Math.abs(t.instant - inst) < 3 * 60_000);
        if (near) continue;
        const lunar = Solar.fromYmdHms(year, month, day, h, mi, 0).getLunar();
        const p = fourPillars(inst, { tzOffsetMinutes: TZ, ziHourConvention: 'day_changes_at_00' });
        const label = `${year}-${month}-${day} ${h}:${mi}`;
        expect(gz(p.day), label + ' ngày').toBe(lunar.getDayInGanZhi());
        expect(gz(p.month), label + ' tháng').toBe(lunar.getMonthInGanZhiExact());
        expect(gz(p.year), label + ' năm').toBe(lunar.getYearInGanZhiExact());
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(200000);
  });

  it('Can Chi giờ khớp thư viện (mặc định 23h; 00h cho 0..22h)', () => {
    const TZ = 480;
    for (let j = FIRST; j <= LAST; j += 5) {
      const { year, month, day } = ymdFromJdn(j);
      for (let h = 0; h < 24; h += 1) {
        const inst = fromLocalParts(year, month, day, h, 30, 0, TZ);
        const ref = Solar.fromYmdHms(year, month, day, h, 30, 0).getLunar();
        const p23 = fourPillars(inst, { tzOffsetMinutes: TZ, ziHourConvention: 'day_changes_at_23' });
        expect(gz(p23.hour), `${year}-${month}-${day} ${h}h`).toBe(ref.getTimeInGanZhi());
        expect(gz(p23.day)).toBe(ref.getDayInGanZhiExact());
        if (h < 23) {
          const p00 = fourPillars(inst, { tzOffsetMinutes: TZ, ziHourConvention: 'day_changes_at_00' });
          expect(gz(p00.hour)).toBe(ref.getTimeInGanZhi());
        }
      }
    }
  });

  it('Can Chi tháng đổi đúng tại thời điểm tiết (±5 phút) và khớp thư viện', () => {
    const TZ = 480;
    for (let y = 1900; y <= 2100; y++) {
      for (const t of getSolarTerms(y)) {
        if (t.index % 2 !== 0) continue; // chỉ "tiết"
        const before = t.instant - 5 * 60_000;
        const after = t.instant + 5 * 60_000;
        const pb = fourPillars(before, { tzOffsetMinutes: TZ });
        const pa = fourPillars(after, { tzOffsetMinutes: TZ });
        expect(pa.month.branch).toBe((pb.month.branch + 1) % 12);
        for (const inst of [before, after]) {
          const p = toLocalParts(inst, TZ);
          const ref = Solar.fromYmdHms(p.year, p.month, p.day, p.hour, p.minute, p.second).getLunar();
          const mine = fourPillars(inst, { tzOffsetMinutes: TZ });
          expect(gz(mine.month)).toBe(ref.getMonthInGanZhiExact());
          expect(gz(mine.year)).toBe(ref.getYearInGanZhiExact());
        }
      }
    }
  });

  it('currentSolarTerm nhất quán', () => {
    const t = getSolarTerms(2026)[2]; // Lập Xuân 2026
    expect(currentSolarTerm(t.instant - 1000).term.def.id).toBe('dai_han');
    expect(currentSolarTerm(t.instant).term.def.id).toBe('lap_xuan');
  });
});

describe('Âm lịch', () => {
  it('khớp lịch Trung Quốc (UTC+8) của lunar-javascript khi dùng cùng múi giờ', () => {
    const diffs: string[] = [];
    for (let j = FIRST; j <= LAST; j++) {
      const { year, month, day } = ymdFromJdn(j);
      const ref = Solar.fromYmd(year, month, day).getLunar();
      const mine = jdnToLunar(j, 480);
      const refMonth = ref.getMonth();
      const same =
        mine.year === ref.getYear() &&
        mine.month === Math.abs(refMonth) &&
        mine.isLeapMonth === refMonth < 0 &&
        mine.day === ref.getDay();
      if (!same) diffs.push(`${year}-${month}-${day}`);
    }
    console.log(`[âm lịch] lệch so với lunar-javascript (UTC+8): ${diffs.length} ngày`, diffs.slice(0, 20));
    // Cho phép lệch trước 1929 (Trung Quốc dùng giờ địa phương Bắc Kinh UTC+7:45) — xem VERIFICATION.md
    const after1929 = diffs.filter((d) => Number(d.split('-')[0]) >= 1929);
    // Ngoại lệ có giải thích (VERIFICATION.md): tháng bắt đầu 2057-09-28 — Trăng mới lúc 23:59:57
    // giờ Bắc Kinh (3 giây trước nửa đêm), thư viện xếp sang ngày hôm sau. Nằm trong sai số thuật toán.
    const lo = jdnFromYMD(2057, 9, 28);
    const hi = jdnFromYMD(2057, 10, 27);
    const unexplained = after1929.filter((d) => {
      const [y, m, dd] = d.split('-').map(Number);
      const j = jdnFromYMD(y, m, dd);
      return j < lo || j > hi;
    });
    console.log('[âm lịch] lệch từ 1929:', after1929.length, 'trong đó chưa giải thích:', unexplained.length);
    expect(unexplained.length).toBe(0);
  });

  it('khứ hồi solarToLunarVN <-> lunarToSolarVN 1900-2100', () => {
    for (let j = FIRST; j <= LAST; j++) {
      const { year, month, day } = ymdFromJdn(j);
      const l = solarToLunarVN(year, month, day);
      const back = lunarToSolarVN(l.year, l.month, l.day, l.isLeapMonth);
      expect(back).toEqual({ year, month, day });
    }
  });

  it('Tết VN một số năm (cố định, đã biết)', () => {
    // Mùng 1 Tết: 2000-02-05, 2020-01-25, 2024-02-10, 2025-01-29, 2026-02-17
    const tet = (y: number) => lunarToSolarVN(y, 1, 1, false);
    expect(tet(2000)).toEqual({ year: 2000, month: 2, day: 5 });
    expect(tet(2020)).toEqual({ year: 2020, month: 1, day: 25 });
    expect(tet(2024)).toEqual({ year: 2024, month: 2, day: 10 });
    expect(tet(2025)).toEqual({ year: 2025, month: 1, day: 29 });
    expect(tet(2026)).toEqual({ year: 2026, month: 2, day: 17 });
  });

  it('tháng nhuận: 2023 nhuận tháng 2; 2025 nhuận tháng 6', () => {
    const t = getLunarTable(420);
    const leaps = (y: number) => t.filter((m) => m.year === y && m.leap).map((m) => m.month);
    expect(leaps(2023)).toEqual([2]);
    expect(leaps(2025)).toEqual([6]);
  });

  it('mỗi năm âm có 12 hoặc 13 tháng, mỗi tháng 29 hoặc 30 ngày', () => {
    const t = getLunarTable(420);
    const byYear = new Map<number, number>();
    for (const m of t) {
      expect([29, 30]).toContain(m.length);
      byYear.set(m.year, (byYear.get(m.year) ?? 0) + 1);
    }
    for (let y = 1900; y <= 2100; y++) expect([12, 13]).toContain(byYear.get(y));
  });

  it('khác biệt Việt-Trung được ghi nhận (thông tin)', () => {
    let n = 0;
    for (let j = FIRST; j <= LAST; j++) {
      const a = jdnToLunar(j, 420);
      const b = jdnToLunar(j, 480);
      if (a.day !== b.day || a.month !== b.month || a.year !== b.year) n++;
    }
    console.log(`[âm lịch] ngày VN ≠ TQ (cùng thuật toán): ${n}`);
    expect(n).toBeGreaterThan(0);
  });
});
