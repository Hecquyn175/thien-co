import { describe, expect, it } from 'vitest';
import { buildBaziChart, Profile } from '../src/core/bazi/chart';
import { PALACE_INFOS } from '../src/core/bazi/palaces';

const SAMPLE_PROFILES: Profile[] = [
  {
    id: 'sample-1-nam-1990',
    name: 'Mẫu 1 (Nam, 1990-05-15 09:30 dương)',
    birth: { datetime: '1990-05-15T09:30', tz: 420, calendar: 'solar' },
    birthTimeKnown: true,
    gender: 'nam',
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'sample-2-nu-1995-ty',
    name: 'Mẫu 2 (Nữ, 1995-08-20 23:30 giờ Tý muộn)',
    birth: { datetime: '1995-08-20T23:30', tz: 420, calendar: 'solar' },
    birthTimeKnown: true,
    gender: 'nu',
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'sample-3-khong-gio-2002',
    name: 'Mẫu 3 (Không rõ giờ sinh, không nêu giới tính, âm lịch)',
    birth: { datetime: '2002-03-10T00:00', tz: 420, calendar: 'lunar', isLeapMonth: false },
    birthTimeKnown: false,
    gender: 'khong_neu',
    createdAt: 0,
    updatedAt: 0,
  },
];

describe('Bát Tự cá nhân (Giai đoạn 3)', () => {
  it('Snapshot 3 hồ sơ mẫu ổn định và đầy đủ thông tin', () => {
    const charts = SAMPLE_PROFILES.map((p) => buildBaziChart(p, 'day_changes_at_23'));

    // Hồ sơ 1: 1990-05-15 09:30 -> Canh Ngọ (năm), Tân Tỵ (tháng), Canh Thìn (ngày), Tân Tỵ (giờ)
    const c1 = charts[0];
    expect(c1.year.pillar).toEqual({ stem: 6, branch: 6 }); // Canh Ngọ
    expect(c1.month.pillar).toEqual({ stem: 7, branch: 5 }); // Tân Tỵ
    expect(c1.day.pillar).toEqual({ stem: 6, branch: 4 }); // Canh Thìn
    expect(c1.hour?.pillar).toEqual({ stem: 7, branch: 5 }); // Tân Tỵ
    expect(c1.luckCycles.forward).toBe(true); // Dương nam (Canh) -> thuận
    expect(c1.menhQuai.primary.kuaNumber).toBe(1); // 1990 Nam -> Khảm (1) Đông tứ mệnh
    expect(c1.menhQuai.primary.group).toBe('dong_tu_menh');

    // Hồ sơ 2: 1995-08-20 23:30 (Ất Hợi - Âm nữ -> đại vận thuận)
    const c2 = charts[1];
    expect(c2.year.pillar).toEqual({ stem: 1, branch: 11 }); // Ất Hợi
    expect(c2.luckCycles.forward).toBe(true); // Âm nữ -> thuận
    expect(c2.hour?.pillar.branch).toBe(0); // Giờ Tý

    // Hồ sơ 3: không rõ giờ sinh + không nêu giới tính -> 3 trụ, menhQuai có cả primary và secondary
    const c3 = charts[2];
    expect(c3.birthTimeKnown).toBe(false);
    expect(c3.hour).toBeUndefined();
    expect(c3.menhQuai.secondary).toBeDefined();
    expect(c3.luckCycles.cycles.length).toBe(8);

    // Snapshot tóm tắt 3 hồ sơ
    const summary = charts.map((c) => ({
      id: c.profileId,
      pillars: [c.year.pillar, c.month.pillar, c.day.pillar, c.hour?.pillar ?? null],
      strength: { score: c.strength.score, label: c.strength.label },
      usefulGod: {
        dungThan: c.usefulGod.dungThan,
        hyThan: c.usefulGod.hyThan,
        kyThan: c.usefulGod.kyThan,
      },
      firstLuck: c.luckCycles.cycles[0],
      kua: c.menhQuai.primary.kuaNumber,
    }));
    expect(summary).toEqual([
      {
        id: 'sample-1-nam-1990',
        pillars: [
          { stem: 6, branch: 6 },
          { stem: 7, branch: 5 },
          { stem: 6, branch: 4 },
          { stem: 7, branch: 5 },
        ],
        strength: { score: 49, label: 'can_bang' },
        usefulGod: { dungThan: 'tho', hyThan: 'kim', kyThan: 'hoa' },
        firstLuck: {
          index: 1,
          pillar: { stem: 8, branch: 6 },
          startAge: 7,
          endAge: 16,
          startYear: 1997,
          endYear: 2006,
        },
        kua: 1,
      },
      {
        id: 'sample-2-nu-1995-ty',
        pillars: [
          { stem: 1, branch: 11 },
          { stem: 0, branch: 8 },
          { stem: 0, branch: 8 },
          { stem: 0, branch: 0 },
        ],
        strength: { score: 53, label: 'can_bang' },
        usefulGod: { dungThan: 'kim', hyThan: 'tho', kyThan: 'thuy' },
        firstLuck: {
          index: 1,
          pillar: { stem: 1, branch: 9 },
          startAge: 6,
          endAge: 15,
          startYear: 2001,
          endYear: 2010,
        },
        kua: 1,
      },
      {
        id: 'sample-3-khong-gio-2002',
        pillars: [
          { stem: 8, branch: 6 },
          { stem: 0, branch: 4 },
          { stem: 6, branch: 8 },
          null,
        ],
        strength: { score: 54, label: 'can_bang' },
        usefulGod: { dungThan: 'hoa', hyThan: 'moc', kyThan: 'tho' },
        firstLuck: {
          index: 1,
          pillar: { stem: 1, branch: 5 },
          startAge: 4,
          endAge: 13,
          startYear: 2006,
          endYear: 2015,
        },
        kua: 7,
      },
    ]);
  });

  it('Can giờ và Can ngày lúc 23:30 thay đổi đúng theo 2 quy ước giờ Tý', () => {
    const p = SAMPLE_PROFILES[1]; // 1995-08-20T23:30
    const c23 = buildBaziChart(p, 'day_changes_at_23');
    const c00 = buildBaziChart(p, 'day_changes_at_00');
    expect(c23.day.pillar.stem).toBe((c00.day.pillar.stem + 1) % 10);
    expect(c23.day.pillar.branch).toBe((c00.day.pillar.branch + 1) % 12);
    expect(c23.hour?.pillar.branch).toBe(0);
    expect(c00.hour?.pillar.branch).toBe(0);
    expect(c23.hour?.pillar.stem).not.toBe(c00.hour?.pillar.stem);
  });

  it('Cung vị theo Chi phủ đủ 4 trụ', () => {
    expect(Object.keys(PALACE_INFOS)).toEqual(['nien_chi', 'nguyet_chi', 'nhat_chi', 'gio_chi']);
  });
});
