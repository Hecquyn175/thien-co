import { describe, it, expect } from 'vitest';
import {
  VIETNAMESE_GLYPH_SAMPLES,
  getUsedCjkGlyphGroups,
  getAllUniqueHanCharacters,
} from '../src/core/glyphs';
import { computeMonthSummarySync } from '../src/workers/calc.worker';
import type { Profile } from '../src/core/bazi/chart';

const TEST_PROFILE: Profile = {
  id: 'glyph-test-prof',
  name: 'Minh An',
  gender: 'nam',
  birthTimeKnown: true,
  birth: {
    calendar: 'solar',
    datetime: '1990-05-15T09:30',
    tz: 420,
  },
  createdAt: 0,
  updatedAt: 0,
};

describe('Glyph Verification & Worker Month Summary', () => {
  it('covers all 13 Vietnamese vowel rows and 6 tones', () => {
    expect(VIETNAMESE_GLYPH_SAMPLES.tonesTable).toHaveLength(13);
    const fullText = VIETNAMESE_GLYPH_SAMPLES.tonesTable.join(' ');
    for (const ch of [
      'Ắ', 'Ằ', 'Ẳ', 'Ẵ', 'Ặ',
      'Ấ', 'Ầ', 'Ẩ', 'Ẫ', 'Ậ',
      'Ớ', 'Ờ', 'Ở', 'Ỡ', 'Ợ',
      'Ứ', 'Ừ', 'Ử', 'Ữ', 'Ự',
      'Đ', 'đ',
    ]) {
      expect(fullText).toContain(ch);
    }
  });

  it('collects all CJK glyph groups and unique Han characters across datasets', () => {
    const groups = getUsedCjkGlyphGroups();
    expect(groups.length).toBeGreaterThanOrEqual(11);
    const uniqueHan = getAllUniqueHanCharacters();
    expect(uniqueHan.length).toBeGreaterThan(80);
    for (const ch of ['甲', '乙', '丙', '丁', '子', '丑', '寅', '卯', '乾', '坤']) {
      expect(uniqueHan).toContain(ch);
    }
  });

  it('computes month summary synchronously in worker module', () => {
    const cells = computeMonthSummarySync({
      year: 2026,
      month: 5,
      tzOffsetMinutes: 420,
      ziConvention: 'day_changes_at_23',
      profile: TEST_PROFILE,
    });
    expect(cells).toHaveLength(31);
    expect(cells[0].dateStr).toBe('2026-05-01');
    expect(cells[0].luckScore).toBeGreaterThanOrEqual(0);
    expect(cells[0].luckScore).toBeLessThanOrEqual(100);
  });
});
