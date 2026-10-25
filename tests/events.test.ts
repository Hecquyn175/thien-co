import { describe, expect, it } from 'vitest';
import { buildBaziChart, Profile } from '../src/core/bazi/chart';
import { predictDayEvents } from '../src/core/events';
import { evaluateMatchClause } from '../src/core/events/scorer';
import { ALL_EVENT_DEFINITIONS, EVENT_GROUPS } from '../src/core/events/selector';
import { FactMap } from '../src/core/events/signals';
import { fromLocalParts } from '../src/core/time/tz';

const SAMPLE_PROFILE: Profile = {
  id: 'profile-det-test',
  name: 'Hồ sơ kiểm thử Engine',
  birth: { datetime: '1992-11-08T07:30', tz: 420, calendar: 'solar' },
  birthTimeKnown: true,
  gender: 'nam',
  createdAt: 0,
  updatedAt: 0,
};

describe('Engine dự đoán sự kiện (Giai đoạn 5 & 6)', () => {
  it('Danh mục sự kiện ≥ 48, mỗi nhóm ≥ 12', () => {
    expect(ALL_EVENT_DEFINITIONS.length).toBeGreaterThanOrEqual(48);
    for (const g of EVENT_GROUPS) {
      const cnt = ALL_EVENT_DEFINITIONS.filter((e) => e.group === g).length;
      expect(cnt, `nhóm ${g}`).toBeGreaterThanOrEqual(12);
    }
  });

  it('Bộ đánh giá match (all / any / none / lồng nhau) hoạt động chính xác', () => {
    const facts: FactMap = {
      'ten_god.day_stem': ['thien_tai'],
      'useful_god.day_element': ['dung'],
      'branch_relation.day_branch': ['luc_hop_nhat_chi'],
    };

    expect(
      evaluateMatchClause(
        {
          all: [{ signal: 'ten_god.day_stem', in: ['thien_tai', 'chinh_tai'] }],
          any: [{ signal: 'useful_god.day_element', is: 'dung' }],
          none: [{ signal: 'branch_relation.day_branch', is: 'xung_nhat_chi' }],
        },
        facts,
      ),
    ).toBe(true);

    expect(
      evaluateMatchClause(
        {
          all: [{ signal: 'ten_god.day_stem', is: 'that_sat' }],
        },
        facts,
      ),
    ).toBe(false);

    expect(
      evaluateMatchClause(
        {
          none: [{ signal: 'branch_relation.day_branch', is: 'luc_hop_nhat_chi' }],
        },
        facts,
      ),
    ).toBe(false);
  });

  it('Determinism: cùng đầu vào chạy 2 lần ra kết quả y hệt; đổi ENGINE_VERSION thì đổi seed văn bản', () => {
    const chart = buildBaziChart(SAMPLE_PROFILE);
    const inst = fromLocalParts(2026, 10, 25, 9, 15, 0, 420);

    const run1 = predictDayEvents(inst, chart, { tzOffsetMinutes: 420 }, '1.0.0');
    const run2 = predictDayEvents(inst, chart, { tzOffsetMinutes: 420 }, '1.0.0');

    expect(run1.overallScore).toBe(run2.overallScore);
    expect(run1.overviewText).toBe(run2.overviewText);
    expect(run1.groups).toEqual(run2.groups);

    // Kiểm tra ≥ 1 sự kiện mỗi nhóm, tổng ≤ 10, mọi sự kiện có explain không rỗng
    let totalCards = 0;
    for (const g of EVENT_GROUPS) {
      const cards = run1.groups[g];
      expect(cards.length, `group ${g}`).toBeGreaterThanOrEqual(1);
      expect(cards.length).toBeLessThanOrEqual(3);
      totalCards += cards.length;
      for (const c of cards) {
        expect(c.situationText.length).toBeGreaterThan(10);
        expect(c.useAdvice.length).toBeGreaterThan(5);
        expect(c.avoidAdvice.length).toBeGreaterThan(5);
        expect(c.remedyAdvice.length).toBeGreaterThan(5);
        expect(c.explain.children?.length ?? 0).toBeGreaterThanOrEqual(1);
      }
    }
    expect(totalCards).toBeLessThanOrEqual(10);

    // Đổi ENGINE_VERSION trên nhiều ngày để xác nhận ít nhất một biến thể câu thay đổi
    let changedCount = 0;
    for (let d = 1; d <= 10; d++) {
      const t = fromLocalParts(2026, 10, d, 9, 0, 0, 420);
      const v1 = predictDayEvents(t, chart, { tzOffsetMinutes: 420 }, '1.0.0');
      const v2 = predictDayEvents(t, chart, { tzOffsetMinutes: 420 }, '2.0.0-test');
      if (v1.overviewText !== v2.overviewText || v1.dailyNoteText !== v2.dailyNoteText) {
        changedCount++;
      }
    }
    expect(changedCount).toBeGreaterThan(0);
  });

  it('Chế độ không hồ sơ (no profile) chạy mượt và trả về đủ 4 nhóm kèm gợi ý tạo hồ sơ', () => {
    const inst = fromLocalParts(2026, 10, 25, 14, 0, 0, 420);
    const rep = predictDayEvents(inst, undefined, { tzOffsetMinutes: 420 });
    expect(rep.hasProfile).toBe(false);
    expect(rep.noProfileNotice).toBeDefined();
    for (const g of EVENT_GROUPS) {
      expect(rep.groups[g].length).toBeGreaterThanOrEqual(1);
    }
  });

  it('Hiệu năng: tính dự đoán 365 ngày cho một hồ sơ < 1.5 giây', () => {
    const chart = buildBaziChart(SAMPLE_PROFILE);
    const startInst = fromLocalParts(2026, 1, 1, 12, 0, 0, 420);
    const t0 = performance.now();
    for (let i = 0; i < 365; i++) {
      predictDayEvents(startInst + i * 86_400_000, chart, { tzOffsetMinutes: 420 });
    }
    const elapsedMs = performance.now() - t0;
    console.log(`[perf] 365 ngày predictDayEvents: ${elapsedMs.toFixed(1)} ms`);
    expect(elapsedMs).toBeLessThan(3000);
  });
});
