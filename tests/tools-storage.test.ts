import { describe, expect, it } from 'vitest';
import { buildBaziChart, Profile } from '../src/core/bazi/chart';
import { evaluateCompatibility } from '../src/core/compat/compat';
import { computeFlyingStars } from '../src/core/directions/flying-stars';
import { computeQimenBoard } from '../src/core/directions/qimen';
import { castMaiHoaByTime, castThreeCoins, getDailyHexagram } from '../src/core/iching/cast';
import { HEXAGRAMS } from '../src/core/iching/hexagrams';
import { rankDatesForPurpose } from '../src/core/picker/rank';
import { fromLocalParts } from '../src/core/time/tz';
import {
  clearAllData,
  computeJournalStats,
  exportAllData,
  importAllData,
  migrateBackupPayload,
} from '../src/storage';

const PROFILE_A: Profile = {
  id: 'p-a',
  name: 'Nguyễn Văn A',
  birth: { datetime: '1990-05-15T09:30', tz: 420, calendar: 'solar' },
  birthTimeKnown: true,
  gender: 'nam',
  createdAt: 1,
  updatedAt: 1,
};

const PROFILE_B: Profile = {
  id: 'p-b',
  name: 'Trần Thị B',
  birth: { datetime: '1993-10-20T14:15', tz: 420, calendar: 'solar' },
  birthTimeKnown: true,
  gender: 'nu',
  createdAt: 2,
  updatedAt: 2,
};

describe('Chọn ngày, Hợp tuổi, Kinh Dịch, Phi tinh, Kỳ Môn, Storage (Giai đoạn 9–11)', () => {
  it('64 quẻ Kinh Dịch duy nhất và Gieo quẻ deterministic (Mai Hoa, 3 đồng xu, Quẻ ngày)', () => {
    expect(HEXAGRAMS.length).toBe(64);
    expect(new Set(HEXAGRAMS.map((h) => h.lines)).size).toBe(64);

    const inst = fromLocalParts(2026, 10, 25, 10, 30, 0, 420);
    const mh1 = castMaiHoaByTime(inst, 420, 'Hỏi việc hợp tác');
    const mh2 = castMaiHoaByTime(inst, 420, 'Hỏi việc hợp tác');
    expect(mh1).toEqual(mh2);
    expect(mh1.movingLines.length).toBe(1);

    const c1 = castThreeCoins(1700000000000, 'Xin hỏi hướng công việc quý tới');
    const c2 = castThreeCoins(1700000000000, 'Xin hỏi hướng công việc quý tới');
    expect(c1).toEqual(c2);
    expect(c1.coinValues?.length).toBe(6);

    const d1 = getDailyHexagram(inst, 420, 'p-a');
    const d2 = getDailyHexagram(inst, 420, 'p-a');
    expect(d1).toEqual(d2);
  });

  it('Chọn ngày theo mục đích (picker): trả về Top 5 ngày + 3 giờ đẹp + danh sách tránh kèm lý do', () => {
    const chartA = buildBaziChart(PROFILE_A);
    const chartB = buildBaziChart(PROFILE_B);
    const startInst = fromLocalParts(2026, 10, 25, 12, 0, 0, 420);

    const res = rankDatesForPurpose(startInst, 30, 'cuoi_hoi', 420, chartA, chartB);
    expect(res.topDays.length).toBe(5);
    for (const d of res.topDays) {
      expect(d.top3Hours.length).toBe(3);
      expect(d.reasons.length).toBeGreaterThan(0);
    }
    expect(res.avoidDays.length).toBeGreaterThan(0);
    for (const ad of res.avoidDays) {
      expect(ad.avoidReasons.length).toBeGreaterThan(0);
    }
  });

  it('Hợp tuổi / hợp mệnh (compat): trả về điểm 3 mảng và gợi ý hôm nay cùng làm gì', () => {
    const chartA = buildBaziChart(PROFILE_A);
    const chartB = buildBaziChart(PROFILE_B);
    const inst = fromLocalParts(2026, 10, 25, 12, 0, 0, 420);

    const compat = evaluateCompatibility(chartA, chartB, inst, 420);
    expect(compat.overallScore).toBeGreaterThanOrEqual(25);
    expect(compat.overallScore).toBeLessThanOrEqual(96);
    expect(compat.domains.tinhCam.points.length).toBeGreaterThan(0);
    expect(compat.domains.lamAn.points.length).toBeGreaterThan(0);
    expect(compat.domains.songChung.points.length).toBeGreaterThan(0);
    expect(compat.todayTogetherSuggestions.length).toBeGreaterThanOrEqual(3);
  });

  it('Phi tinh & Kỳ Môn Độn Giáp hoạt động ổn định, phủ đủ 8 hướng', () => {
    const inst = fromLocalParts(2026, 10, 25, 15, 0, 0, 420);
    const fs = computeFlyingStars(inst, 420);
    expect(Object.keys(fs.day.byDirection).length).toBe(8);
    expect(fs.year.centerStar).toBe(1); // 2026 = Nhất Bạch

    const qm = computeQimenBoard(inst, 420);
    expect(Object.keys(qm.byDirection).length).toBe(8);
    expect(qm.juNumber).toBeGreaterThanOrEqual(1);
    expect(qm.juNumber).toBeLessThanOrEqual(9);
    expect(qm.confidence).toBe('C');
  });

  it('Storage: migrate schema cũ, xuất/nhập JSON, xóa toàn bộ dữ liệu và thống kê Nhật ký', async () => {
    await clearAllData();
    const legacyPayload = {
      // thiếu schemaVersion, thiếu một số trường trong profile/journal
      settings: { ziHourConvention: 'day_changes_at_00', theme: 'dark' },
      profiles: [
        {
          id: 'legacy-1',
          name: 'Hồ sơ cũ',
          birth: { datetime: '1988-04-12T08:00', calendar: 'solar' },
        },
      ],
      journals: [
        {
          dateISO: '2026-10-24',
          profileId: 'legacy-1',
          groupRatings: { nguoi: 4, tien_bac: 5 },
          predictedEventIds: ['nguoi.quy_nhan_giup_do', 'tien_bac.thu_ngoai_du_kien'],
          occurredEventIds: ['nguoi.quy_nhan_giup_do'],
          note: 'Ngày tốt',
        },
      ],
    };

    const migrated = migrateBackupPayload(legacyPayload);
    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.profiles[0].birth.tz).toBe(420);
    expect(migrated.journals[0].groupRatings.cong_viec).toBe(3);

    await importAllData(legacyPayload);
    const exported = await exportAllData();
    expect(exported.profiles.length).toBe(1);
    expect(exported.journals.length).toBe(1);
    expect(exported.settings.ziHourConvention).toBe('day_changes_at_00');

    const stats = computeJournalStats(exported.journals);
    expect(stats.totalDaysLogged).toBe(1);
    expect(stats.matchRatePercent).toBe(50);

    await clearAllData();
    const afterClear = await exportAllData();
    expect(afterClear.profiles.length).toBe(0);
    expect(afterClear.journals.length).toBe(0);
  });
});
