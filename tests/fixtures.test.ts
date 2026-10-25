import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/verified-dates.json';
import { instantFromLocalString, localJdn } from '../src/core/time/tz';
import { jdnFromYMD } from '../src/core/time/jdn';
import { solarToLunarVN } from '../src/core/time/lunar-vn';
import { dayPillarFromJdn } from '../src/core/ganzhi/pillars';
import ganzhi from '../src/data/ganzhi.json';

const vi = (p: { stem: number; branch: number }) =>
  `${ganzhi.stems[p.stem].vi} ${ganzhi.branches[p.branch].vi}`;

describe('verified-dates.json', () => {
  const checkable = fixtures.entries.filter(
    (e) => ['ANCHOR_FROM_SPEC', 'VERIFIED_BY_USER'].includes(e.status) && 'solar' in e,
  );
  it('có mục cần chủ dự án kiểm chứng', () => {
    expect(fixtures.entries.some((e) => e.status === 'TODO_USER_VERIFY')).toBe(true);
  });
  for (const e of checkable) {
    it(`khớp: ${e.id}`, () => {
      const [y, m, d] = (e as { solar: string }).solar.split('-').map(Number);
      const exp = (e as { expect: { dayGanzhi?: string; lunar?: { year: number; month: number; day: number; leap: boolean } } }).expect;
      if (exp.dayGanzhi) {
        const inst = instantFromLocalString(`${(e as { solar: string }).solar}T12:00`, e.tz);
        expect(vi(dayPillarFromJdn(localJdn(inst, e.tz)))).toBe(exp.dayGanzhi);
        expect(jdnFromYMD(y, m, d)).toBe(localJdn(inst, e.tz));
      }
      if (exp.lunar) {
        const l = solarToLunarVN(y, m, d, e.tz);
        expect({ year: l.year, month: l.month, day: l.day, leap: l.isLeapMonth }).toEqual(exp.lunar);
      }
    });
  }
});
