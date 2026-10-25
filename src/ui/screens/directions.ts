import type { BaguaDir } from '../../core/types';
import { buildBaziChart, type Profile } from '../../core/bazi/chart';
import type { AppSettings } from '../../storage';
import { computeDayAlmanac } from '../../core/almanac/gio-dep';
import { computeFlyingStars } from '../../core/directions/flying-stars';
import { computeQimenBoard } from '../../core/directions/qimen';
import { renderCompass, type CompassLayer } from '../components/compass';
import { esc, formatGanZhi, renderConfidenceBadge } from '../utils';

export interface DirectionsScreenState {
  dateStr: string;
  hourBranch: number;
  compassLayer: CompassLayer;
  southAtTop: boolean;
  selectedDir: BaguaDir;
  flyingStarPeriod: 'year' | 'month' | 'day' | 'hour';
}

const LUO_SHU_TO_DIR: Record<number, BaguaDir | null> = {
  1: 'bac',
  2: 'tay_nam',
  3: 'dong',
  4: 'dong_nam',
  5: null,
  6: 'tay_bac',
  7: 'tay',
  8: 'dong_bac',
  9: 'nam',
};

export function renderDirectionsScreen(
  container: HTMLElement,
  state: DirectionsScreenState,
  profile: Profile | null,
  settings: AppSettings,
): void {
  const [y, m, d] = state.dateStr.split('-').map(Number);
  const hourWall = (state.hourBranch * 2) % 24;
  const instant =
    Date.UTC(y, m - 1, d, hourWall, 30, 0) - settings.tzOffsetMinutes * 60_000;

  const chart = profile
    ? buildBaziChart(profile, settings.ziHourConvention)
    : undefined;

  const al = computeDayAlmanac(instant, settings.tzOffsetMinutes, chart);
  const fsAll = computeFlyingStars(instant, settings.tzOffsetMinutes);
  const activeFlyingStars = fsAll[state.flyingStarPeriod];
  const qiMen = computeQimenBoard(
    instant,
    settings.tzOffsetMinutes,
    settings.ziHourConvention,
  );

  // Luo Shu 3x3 layout (South at top: 4-9-2 / 3-5-7 / 8-1-6)
  const luoShuOrder = state.southAtTop
    ? [4, 9, 2, 3, 5, 7, 8, 1, 6]
    : [8, 1, 6, 3, 5, 7, 4, 9, 2];

  container.innerHTML = `
    <section class="card">
      <div class="card-header">
        <h2 class="card-title">🧭 La bàn Phương hướng (Bát Quái • Mệnh Quái • Phi Tinh • Kỳ Môn)</h2>
        <div style="display:flex;gap:0.45rem;align-items:center;flex-wrap:wrap;">
          <input type="date" id="dir-date-input" value="${esc(state.dateStr)}" style="width:auto;min-height:38px;" aria-label="Chọn ngày xem hướng" />
          <select id="dir-hour-select" style="width:auto;min-height:38px;" aria-label="Chọn canh giờ">
            ${al.hours
              .map(
                (h) =>
                  `<option value="${h.branch}" ${h.branch === state.hourBranch ? 'selected' : ''}>Giờ ${esc(h.branchVi)} (${esc(h.hoursLabel)})</option>`,
              )
              .join('')}
          </select>
        </div>
      </div>

      ${renderCompass({
        layer: state.compassLayer,
        southAtTop: state.southAtTop,
        selectedDir: state.selectedDir,
        menhQuai: chart?.menhQuai ?? null,
        flyingStars: activeFlyingStars,
        qiMen,
        xuatHanh: al.xuatHanh,
        showHan: settings.showHanChars,
      })}
    </section>

    <!-- 3x3 Luo Shu Grid: Flying Stars & Qi Men -->
    <section class="card">
      <div class="card-header">
        <h3 class="card-title">九 Cửu Cung Lạc Thư: Phi Tinh & Kỳ Môn Độn Giáp</h3>
        <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
          <button type="button" class="btn btn-sm ${state.flyingStarPeriod === 'year' ? 'btn-primary' : ''}" data-fs-period="year">Phi tinh Năm (${fsAll.year.centerStar})</button>
          <button type="button" class="btn btn-sm ${state.flyingStarPeriod === 'month' ? 'btn-primary' : ''}" data-fs-period="month">Phi tinh Tháng (${fsAll.month.centerStar})</button>
          <button type="button" class="btn btn-sm ${state.flyingStarPeriod === 'day' ? 'btn-primary' : ''}" data-fs-period="day">Phi tinh Ngày (${fsAll.day.centerStar})</button>
          <button type="button" class="btn btn-sm ${state.flyingStarPeriod === 'hour' ? 'btn-primary' : ''}" data-fs-period="hour">Phi tinh Giờ (${fsAll.hour.centerStar})</button>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;font-size:0.86rem;color:var(--text-secondary);">
        <span>
          Kỳ Môn Thời Gia: <strong>${qiMen.duongDon ? 'Dương Độn' : 'Âm Độn'} Cục ${qiMen.juNumber}</strong> (${esc(qiMen.yuanVi)} • Tiết ${esc(qiMen.solarTermVi)})
          • Trụ giờ: <strong>${formatGanZhi(qiMen.hourPillar, settings.showHanChars)}</strong>
        </span>
        ${renderConfidenceBadge('C')}
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.55rem;">
        ${luoShuOrder
          .map((num) => {
            const dirCode = LUO_SHU_TO_DIR[num];
            const fs = dirCode
              ? activeFlyingStars.byDirection[dirCode]
              : activeFlyingStars.centerMeta;
            const qm = dirCode ? qiMen.byDirection[dirCode] : null;
            const dirLabel = qm ? qm.directionVi : 'Trung Cung';
            return `
              <div style="background:var(--bg-page);border:1px solid var(--border-strong);border-radius:var(--radius-sm);padding:0.65rem;font-size:0.84rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.3rem;">
                  <strong>Cung ${num} (${esc(dirLabel)})</strong>
                  <span class="badge ${fs.nature === 'cat' ? 'badge-good' : 'badge-bad'}">Sao ${fs.number}</span>
                </div>
                <div style="color:var(--text-secondary);margin-bottom:0.25rem;">${esc(fs.vi)}</div>
                ${
                  qm
                    ? `<div style="border-top:1px dashed var(--border-color);padding-top:0.25rem;margin-top:0.25rem;">
                        <div>🚪 Cửa: <strong style="color:${qm.door.rating === 'cat' ? 'var(--status-good)' : qm.door.rating === 'hung' ? 'var(--status-bad)' : 'inherit'};">${esc(qm.door.vi)}</strong></div>
                        <div>⭐ Tinh: ${esc(qm.star.vi)} (${esc(qm.heavenStem)}/${esc(qm.earthStem)})</div>
                        <div>🛡️ Thần: ${esc(qm.deity.vi)}</div>
                      </div>`
                    : `<div style="color:var(--text-muted);font-style:italic;">Trung Cung (Kỳ Môn gửi Khôn 2)</div>`
                }
              </div>
            `;
          })
          .join('')}
      </div>
    </section>
  `;

  container.querySelector('#dir-date-input')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLInputElement).value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      state.dateStr = val;
      renderDirectionsScreen(container, state, profile, settings);
    }
  });

  container.querySelector('#dir-hour-select')?.addEventListener('change', (e) => {
    state.hourBranch = Number((e.target as HTMLSelectElement).value);
    renderDirectionsScreen(container, state, profile, settings);
  });

  container.querySelectorAll('[data-fs-period]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.flyingStarPeriod = btn.getAttribute('data-fs-period') as DirectionsScreenState['flyingStarPeriod'];
      renderDirectionsScreen(container, state, profile, settings);
    });
  });

  container.querySelectorAll('[data-compass-layer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.compassLayer = btn.getAttribute('data-compass-layer') as CompassLayer;
      renderDirectionsScreen(container, state, profile, settings);
    });
  });

  container.querySelector('[data-compass-toggle-orient]')?.addEventListener('click', () => {
    state.southAtTop = !state.southAtTop;
    renderDirectionsScreen(container, state, profile, settings);
  });

  container.querySelectorAll('[data-compass-dir]').forEach((el) => {
    el.addEventListener('click', () => {
      state.selectedDir = el.getAttribute('data-compass-dir') as BaguaDir;
      renderDirectionsScreen(container, state, profile, settings);
    });
  });
}
