import type { Profile } from '../../core/bazi/chart';
import type { AppSettings } from '../../storage';
import { runMonthSummaryInWorker } from '../../workers/client';
import type { MonthDayCellSummary } from '../../workers/calc.worker';
import { esc, formatGanZhi, renderLuckBadge } from '../utils';

export interface CalendarScreenState {
  year: number;
  month: number; // 1..12
  selectedDay: number;
  onlyGoodDays: boolean;
}

const WEEKDAYS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export async function renderCalendarScreen(
  container: HTMLElement,
  state: CalendarScreenState,
  profile: Profile | null,
  settings: AppSettings,
  onJumpToTodayDate: (dateStr: string) => void,
): Promise<void> {
  container.innerHTML = `<div class="card"><p>Đang tính lịch tháng ${state.month}/${state.year}...</p></div>`;

  const cells = await runMonthSummaryInWorker({
    year: state.year,
    month: state.month,
    tzOffsetMinutes: settings.tzOffsetMinutes,
    ziConvention: settings.ziHourConvention,
    profile,
  });

  // First day of month weekday (Monday=0 .. Sunday=6)
  const firstDow = (new Date(Date.UTC(state.year, state.month - 1, 1)).getUTCDay() + 6) % 7;
  const emptyLeading = Array.from({ length: firstDow }, () => `<div style="min-height:68px;"></div>`).join('');

  const showHan = settings.showHanChars;
  const selectedCell: MonthDayCellSummary =
    cells.find((c) => c.day === state.selectedDay) ?? cells[0];

  const cellsHtml = cells
    .map((c) => {
      const isSelected = c.day === selectedCell.day;
      const isGood = c.luckScore >= 62;
      const isBad = c.luckScore < 42;
      const dimmed = state.onlyGoodDays && !isGood;

      const dotSymbol = isGood ? '🟢 ●' : isBad ? '🔴 ▲' : '🟡 ◐';
      const lunarD = c.almanac.lunar.day;
      const lunarM = c.almanac.lunar.month;
      const lunarLabel =
        lunarD === 1
          ? `<strong style="color:var(--accent-red);">${lunarD}/${lunarM}${c.almanac.lunar.isLeapMonth ? 'N' : ''}</strong>`
          : lunarD === 15
            ? `<strong style="color:var(--accent-gold);">Rằm ${lunarD}</strong>`
            : `${lunarD}`;

      return `
        <button
          type="button"
          class="cal-cell ${isSelected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}"
          data-cal-day="${c.day}"
          title="Ngày ${c.dateStr} — Điểm vận ${c.luckScore}/100 (${c.luckLabel})"
        >
          <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
            <span class="cal-solar">${c.day}</span>
            <span class="cal-lunar">${lunarLabel}</span>
          </div>
          <div style="font-size:0.68rem;color:var(--text-secondary);text-align:left;margin-top:2px;">
            ${formatGanZhi(c.almanac.dayPillar, false)}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;width:100%;font-size:0.68rem;margin-top:2px;">
            <span>${dotSymbol}</span>
            <strong>${c.luckScore}đ</strong>
          </div>
        </button>
      `;
    })
    .join('');

  const selAl = selectedCell.almanac;

  container.innerHTML = `
    <section class="card">
      <div class="card-header">
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
          <button type="button" class="btn btn-sm" id="cal-prev-month">◀ Tháng trước</button>
          <h2 style="margin:0;font-size:1.25rem;">Tháng ${state.month} / ${state.year}</h2>
          <button type="button" class="btn btn-sm" id="cal-next-month">Tháng sau ▶</button>
        </div>
        <label style="display:inline-flex;align-items:center;gap:0.45rem;margin:0;cursor:pointer;">
          <input type="checkbox" id="cal-filter-good" ${state.onlyGoodDays ? 'checked' : ''} style="width:18px;min-height:18px;" />
          <span>Chỉ làm nổi bật ngày tốt cho mình (≥ 62 điểm)</span>
        </label>
      </div>

      <div style="display:flex;gap:1rem;font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.6rem;flex-wrap:wrap;">
        <span>🟢 ● Thuận lợi / Cát (≥ 62đ)</span>
        <span>🟡 ◐ Bình hòa (42–61đ)</span>
        <span>🔴 ▲ Cần thận trọng (&lt; 42đ)</span>
      </div>

      <div class="cal-grid">
        ${WEEKDAYS_VI.map((w) => `<div class="cal-day-header">${w}</div>`).join('')}
        ${emptyLeading}
        ${cellsHtml}
      </div>
    </section>

    <!-- Selected Day Summary Drawer -->
    <section class="card">
      <div class="card-header">
        <h3 class="card-title">
          📅 Chi tiết ngày ${selectedCell.dateStr} (Âm lịch: ${selAl.lunar.day}/${selAl.lunar.month}${selAl.lunar.isLeapMonth ? ' Nhuận' : ''}/${selAl.lunar.year})
        </h3>
        <button type="button" class="btn btn-sm btn-primary" id="cal-open-in-today">
          🔮 Xem dự đoán đầy đủ ở tab Hôm nay →
        </button>
      </div>

      <div style="display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap;margin-bottom:0.65rem;">
        ${renderLuckBadge(selectedCell.luckLabel)}
        <span>Điểm vận cá nhân: <strong>${selectedCell.luckScore}/100</strong></span>
        <span>•</span>
        <span>Ngày: <strong>${formatGanZhi(selAl.dayPillar, showHan)}</strong> (${esc(selAl.dayNayin.vi)})</span>
        <span>•</span>
        <span>Trực <strong>${esc(selAl.truc.vi)}</strong> • Sao <strong>${esc(selAl.tu28.vi)}</strong> • <strong>${esc(selAl.hoangDaoDeity.vi)}</strong></span>
      </div>

      <div class="grid-2" style="font-size:0.88rem;">
        <div>
          <strong>✅ Việc nên làm:</strong> ${selAl.nen.map((x) => x.vi).join(', ') || 'Việc thường nhật'}
        </div>
        <div>
          <strong>⚠️ Việc nên kỵ:</strong> ${selAl.ky.map((x) => x.vi).join(', ') || 'Không có đại kỵ'}
        </div>
      </div>
      <div style="margin-top:0.5rem;font-size:0.86rem;color:var(--text-secondary);">
        <strong>🕒 Giờ Hoàng Đạo nổi bật trong ngày:</strong>
        ${selAl.topHours.map((h) => `${esc(h.branchVi)} (${esc(h.hoursLabel)})`).join(', ')}
      </div>
    </section>
  `;

  container.querySelector('#cal-prev-month')?.addEventListener('click', () => {
    if (state.month === 1) {
      state.month = 12;
      state.year -= 1;
    } else {
      state.month -= 1;
    }
    state.selectedDay = 1;
    renderCalendarScreen(container, state, profile, settings, onJumpToTodayDate);
  });

  container.querySelector('#cal-next-month')?.addEventListener('click', () => {
    if (state.month === 12) {
      state.month = 1;
      state.year += 1;
    } else {
      state.month += 1;
    }
    state.selectedDay = 1;
    renderCalendarScreen(container, state, profile, settings, onJumpToTodayDate);
  });

  container.querySelector('#cal-filter-good')?.addEventListener('change', (e) => {
    state.onlyGoodDays = (e.target as HTMLInputElement).checked;
    renderCalendarScreen(container, state, profile, settings, onJumpToTodayDate);
  });

  container.querySelectorAll('[data-cal-day]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const d = Number(btn.getAttribute('data-cal-day'));
      if (!Number.isNaN(d)) {
        state.selectedDay = d;
        renderCalendarScreen(container, state, profile, settings, onJumpToTodayDate);
      }
    });
  });

  container.querySelector('#cal-open-in-today')?.addEventListener('click', () => {
    onJumpToTodayDate(selectedCell.dateStr);
  });
}
