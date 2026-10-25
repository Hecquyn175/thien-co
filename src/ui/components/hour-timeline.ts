import type { HourSlotInfo } from '../../core/almanac/gio-dep';
import { esc, formatGanZhi } from '../utils';

export function renderHourTimeline(
  hours: HourSlotInfo[],
  currentBranch: number,
  selectedBranch: number,
  showHan = true,
): string {
  const slots = hours.map((h) => {
    const isCurrent = h.branch === currentBranch;
    const isSelected = h.branch === selectedBranch;
    const cls = [
      'hour-slot',
      isCurrent ? 'current' : '',
      isSelected ? 'selected' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const badge = h.isHoangDao
      ? `<span class="badge badge-good" style="font-size:0.68rem;padding:1px 6px;">★ Hoàng đạo</span>`
      : `<span class="badge badge-bad" style="font-size:0.68rem;padding:1px 6px;">Hắc đạo</span>`;

    return `
      <button
        type="button"
        class="${cls}"
        data-hour-branch="${h.branch}"
        title="Bấm xem chi tiết giờ ${esc(h.branchVi)} (${esc(h.hoursLabel)})"
      >
        <div style="font-size:0.72rem;color:var(--text-secondary);">
          ${esc(h.hoursLabel)} ${isCurrent ? '• <strong>Hiện tại</strong>' : ''}
        </div>
        <div style="font-weight:700;font-size:0.86rem;margin:2px 0;">
          ${formatGanZhi(h.pillar, showHan)}
        </div>
        <div style="font-size:0.73rem;">${esc(h.deity.vi)}</div>
        <div>${badge}</div>
      </button>
    `;
  });

  const activeHour = hours.find((h) => h.branch === selectedBranch) ?? hours[0];

  return `
    <div>
      <div class="hour-timeline" role="tablist" aria-label="12 canh giờ trong ngày">
        ${slots.join('')}
      </div>
      <div style="margin-top:0.55rem;padding:0.7rem 0.85rem;background:var(--bg-elevated);border-radius:var(--radius-sm);border:1px solid var(--border-color);font-size:0.88rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4rem;">
          <strong>
            Canh giờ đang chọn: Giờ ${esc(activeHour.branchVi)} (${esc(activeHour.hoursLabel)}) — Trụ giờ ${formatGanZhi(activeHour.pillar, showHan)}
          </strong>
          <span class="badge ${activeHour.isHoangDao ? 'badge-good' : 'badge-bad'}">
            ${esc(activeHour.deity.vi)} (${activeHour.isHoangDao ? 'Hoàng đạo' : 'Hắc đạo'})
          </span>
        </div>
        <p style="margin:0.35rem 0 0;color:var(--text-secondary);">
          ${esc(activeHour.deity.summary)} — Điểm thuận lợi khung giờ: <strong>${activeHour.score}/100</strong>${activeHour.personalNote ? ` (${esc(activeHour.personalNote)})` : ''}.
        </p>
      </div>
    </div>
  `;
}
