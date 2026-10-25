import type { BaguaDir, EventGroup } from '../../core/types';
import { buildBaziChart, type Profile } from '../../core/bazi/chart';
import type { AppSettings } from '../../storage';
import { predictDayEvents } from '../../core/events';
import { computeFlyingStars } from '../../core/directions/flying-stars';
import { computeQimenBoard } from '../../core/directions/qimen';
import { renderLuckGauge } from '../components/gauge';
import { renderEventCard } from '../components/event-card';
import { renderHourTimeline } from '../components/hour-timeline';
import { renderCompass, type CompassLayer } from '../components/compass';
import { exportDailyShareCardPng } from '../components/share-card';
import {
  esc,
  formatGanZhi,
  renderElementBadge,
  renderTerm,
} from '../utils';

export interface TodayScreenState {
  dateStr: string; // YYYY-MM-DD
  selectedHourBranch: number;
  compassLayer: CompassLayer;
  southAtTop: boolean;
  selectedDir: BaguaDir;
}

const GROUP_LABELS: Record<EventGroup, { title: string; icon: string }> = {
  nguoi: { title: 'Quan hệ & Con người', icon: '🤝' },
  tien_bac: { title: 'Tài chính & Tiền bạc', icon: '💰' },
  cong_viec: { title: 'Công việc, Học tập & Giấy tờ', icon: '📑' },
  suc_khoe_di_chuyen: { title: 'Sức khỏe, Di chuyển & Thay đổi', icon: '🧭' },
};

export function renderTodayScreen(
  container: HTMLElement,
  state: TodayScreenState,
  profile: Profile | null,
  settings: AppSettings,
  onNavigateTool: (subtab: string) => void,
): void {
  const [y, m, d] = state.dateStr.split('-').map(Number);
  const hourWall = (state.selectedHourBranch * 2) % 24;
  const instant =
    Date.UTC(y, m - 1, d, hourWall, 30, 0) - settings.tzOffsetMinutes * 60_000;

  const chart = profile
    ? buildBaziChart(profile, settings.ziHourConvention)
    : undefined;

  const pred = predictDayEvents(instant, chart, {
    tzOffsetMinutes: settings.tzOffsetMinutes,
    ziHourConvention: settings.ziHourConvention,
  });

  const al = pred.bundle.almanac;
  const showHan = settings.showHanChars;

  const daysToNextTerm = Math.max(
    0,
    Math.ceil((al.nextSolarTerm.instant - instant) / 86_400_000),
  );

  // Current real hour branch
  const nowWallDate = new Date(Date.now() + settings.tzOffsetMinutes * 60_000);
  const currentRealBranch = Math.floor(((nowWallDate.getUTCHours() + 1) % 24) / 2);
  const selectedHourSlot = al.hours[state.selectedHourBranch] ?? al.hours[0];

  const catThan = al.thanSat.filter((s) => s.nature === 'cat');
  const hungSat = al.thanSat.filter((s) => s.nature === 'hung');

  container.innerHTML = `
    <!-- Date Picker & Header Bar -->
    <section class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.65rem;margin-bottom:0.85rem;">
        <div style="display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;">
          <button type="button" class="btn btn-sm" id="btn-prev-day">◀ Hôm qua</button>
          <input type="date" id="today-date-input" value="${esc(state.dateStr)}" style="width:auto;min-height:38px;padding:0.25rem 0.6rem;" aria-label="Chọn ngày xem dự đoán" />
          <button type="button" class="btn btn-sm" id="btn-next-day">Ngày mai ▶</button>
          <button type="button" class="btn btn-sm" id="btn-jump-today">Hôm nay</button>
        </div>
        <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">
          <button type="button" class="btn btn-sm" id="btn-open-journal">📓 Nhật ký cuối ngày</button>
          <button type="button" class="btn btn-sm btn-primary" id="btn-share-png">📤 Chia sẻ thẻ PNG</button>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:0.75rem;border-bottom:1px solid var(--border-color);padding-bottom:0.75rem;margin-bottom:0.85rem;">
        <div>
          <h2 style="margin:0;font-size:1.45rem;">
            Dương lịch: ${d}/${m}/${y}
          </h2>
          <div style="color:var(--text-secondary);font-size:0.95rem;margin-top:0.2rem;">
            Âm lịch Việt Nam: <strong>Ngày ${al.lunar.day} tháng ${al.lunar.month}${al.lunar.isLeapMonth ? ' (Nhuận)' : ''} năm ${al.lunar.year}</strong>
            • Tiết khí: ${renderTerm(al.solarTerm.def.id, al.solarTerm.def.vi)}
            <small>(còn ~${daysToNextTerm} ngày tới ${esc(al.nextSolarTerm.def.vi)})</small>
          </div>
        </div>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;align-items:center;">
          ${renderElementBadge(al.dayNayin.element, showHan)}
          <span class="badge badge-warn">${esc(al.dayNayin.vi)}</span>
        </div>
      </div>

      <!-- 4 Pillars of current instant -->
      <div class="grid-4">
        <div class="pillar-box">
          <div class="pillar-label">Trụ Năm</div>
          <div class="pillar-main">${formatGanZhi(al.yearPillar, showHan)}</div>
        </div>
        <div class="pillar-box">
          <div class="pillar-label">Trụ Tháng</div>
          <div class="pillar-main">${formatGanZhi(al.monthPillar, showHan)}</div>
        </div>
        <div class="pillar-box">
          <div class="pillar-label">Trụ Ngày</div>
          <div class="pillar-main">${formatGanZhi(al.dayPillar, showHan)}</div>
        </div>
        <div class="pillar-box">
          <div class="pillar-label">Trụ Giờ (${esc(selectedHourSlot.branchVi)})</div>
          <div class="pillar-main">${formatGanZhi(selectedHourSlot.pillar, showHan)}</div>
        </div>
      </div>

      <div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:0.75rem;font-size:0.86rem;color:var(--text-secondary);">
        <span>📌 Trực ngày: <strong>${renderTerm(`truc_${al.truc.id}`, `Trực ${al.truc.vi}`)}</strong> (${esc(al.truc.rating)})</span>
        <span>•</span>
        <span>✨ Nhị thập bát tú: <strong>Sao ${esc(al.tu28.vi)}</strong> (${esc(al.tu28.fullVi)} - ${esc(al.tu28.rating)})</span>
        <span>•</span>
        <span>🛡️ Đạo ngày: <strong>${esc(al.hoangDaoDeity.vi)}</strong> (${al.isHoangDaoDay ? 'Hoàng Đạo' : 'Hắc Đạo'})</span>
      </div>
    </section>

    <!-- Luck Score & Overview -->
    <section class="card">
      <div class="card-header">
        <h3 class="card-title">
          🎯 Tổng quan Vận Ngày ${profile ? `(Cá nhân hóa: ${esc(profile.name)})` : '(Lịch chung — Chưa chọn hồ sơ)'}
        </h3>
      </div>
      ${renderLuckGauge(pred.overallScore, pred.ratingLabelVi, pred.overviewText)}
      ${
        pred.noProfileNotice
          ? `<div style="margin-top:0.6rem;padding:0.55rem 0.8rem;background:var(--status-warn-bg);border:1px solid var(--status-warn);border-radius:var(--radius-sm);font-size:0.86rem;">
              💡 ${esc(pred.noProfileNotice)}
            </div>`
          : ''
      }
      ${
        pred.balanceNotes.length > 0
          ? `<div style="margin-top:0.75rem;padding:0.65rem 0.85rem;background:var(--bg-elevated);border-radius:var(--radius-sm);font-size:0.88rem;border-left:3px solid var(--accent-gold);">
              <strong>⚖️ Cân bằng hai mặt trong ngày:</strong> ${esc(pred.balanceNotes.join(' '))}
            </div>`
          : ''
      }
    </section>

    <!-- 4 Event Groups -->
    <section class="card">
      <div class="card-header">
        <h3 class="card-title">🔮 Dự đoán sự kiện & Cách ứng phó trong ngày</h3>
        <span style="font-size:0.8rem;color:var(--text-secondary);">Bấm "Vì sao?" trên từng thẻ để xem quy tắc kích hoạt</span>
      </div>
      ${(Object.entries(GROUP_LABELS) as [EventGroup, { title: string; icon: string }][])
        .map(([groupKey, meta]) => {
          const groupCards = pred.groups[groupKey] ?? [];
          const introText = pred.groupIntros[groupKey] ?? '';
          return `
            <div style="margin-bottom:1.25rem;">
              <h4 style="margin:0 0 0.25rem;display:flex;align-items:center;gap:0.4rem;color:var(--accent-red);">
                <span>${meta.icon}</span> ${esc(meta.title)}
              </h4>
              <p style="margin:0 0 0.6rem;font-size:0.86rem;color:var(--text-secondary);">${esc(introText)}</p>
              ${groupCards
                .map((card, i) => renderEventCard(card, `${groupKey}-${i}`))
                .join('')}
            </div>
          `;
        })
        .join('')}
    </section>

    <!-- 12 Hours Timeline -->
    <section class="card">
      <div class="card-header">
        <h3 class="card-title">🕰️ Dải 12 canh giờ & Giờ Hoàng Đạo</h3>
        <span style="font-size:0.8rem;color:var(--text-secondary);">Bấm vào canh giờ để đổi giờ khảo sát</span>
      </div>
      ${renderHourTimeline(
        al.hours,
        currentRealBranch,
        state.selectedHourBranch,
        showHan,
      )}
    </section>

    <!-- Nên làm / Nên kỵ -->
    <section class="card">
      <div class="card-header">
        <h3 class="card-title">📋 Việc nên làm & Việc nên kỵ hôm nay</h3>
      </div>
      <div class="grid-2">
        <div style="padding:0.75rem;background:var(--status-good-bg);border:1px solid var(--status-good);border-radius:var(--radius-sm);">
          <strong style="color:var(--status-good);display:block;margin-bottom:0.4rem;">✅ Việc thuận lợi (Nên làm)</strong>
          <div style="display:flex;flex-wrap:wrap;gap:0.35rem;">
            ${
              al.nen.length > 0
                ? al.nen.map((item) => `<span class="badge badge-good">${esc(item.vi)}</span>`).join('')
                : '<span>Các việc thường nhật nhẹ nhàng</span>'
            }
          </div>
          ${
            catThan.length > 0
              ? `<div style="margin-top:0.55rem;font-size:0.82rem;color:var(--text-secondary);">
                  <strong>Cát thần:</strong> ${catThan.map((s) => esc(s.vi)).join(', ')}
                </div>`
              : ''
          }
        </div>
        <div style="padding:0.75rem;background:var(--status-bad-bg);border:1px solid var(--status-bad);border-radius:var(--radius-sm);">
          <strong style="color:var(--status-bad);display:block;margin-bottom:0.4rem;">⚠️ Việc cần thận trọng (Nên kỵ)</strong>
          <div style="display:flex;flex-wrap:wrap;gap:0.35rem;">
            ${
              al.ky.length > 0
                ? al.ky.map((item) => `<span class="badge badge-bad">${esc(item.vi)}</span>`).join('')
                : '<span>Không có đại kỵ đáng kể</span>'
            }
          </div>
          ${
            hungSat.length > 0
              ? `<div style="margin-top:0.55rem;font-size:0.82rem;color:var(--text-secondary);">
                  <strong>Hung sát / Ngày kỵ:</strong> ${hungSat.map((s) => esc(s.vi)).join(', ')}
                </div>`
              : ''
          }
        </div>
      </div>
    </section>

    <!-- 8-Direction Compass -->
    <section class="card">
      <div class="card-header">
        <h3 class="card-title">🧭 La bàn 8 hướng trong ngày & giờ đang chọn</h3>
      </div>
      <p style="margin-top:0;font-size:0.88rem;color:var(--text-secondary);">
        ${esc(pred.directionSummaryText)}
      </p>
      ${renderCompass({
        layer: state.compassLayer,
        southAtTop: state.southAtTop,
        selectedDir: state.selectedDir,
        menhQuai: chart?.menhQuai ?? null,
        flyingStars:
          pred.bundle.flyingStars?.day ??
          computeFlyingStars(instant, settings.tzOffsetMinutes).day,
        qiMen:
          pred.bundle.qimen ??
          computeQimenBoard(instant, settings.tzOffsetMinutes, settings.ziHourConvention),
        xuatHanh: al.xuatHanh,
        showHan,
      })}
    </section>

    <!-- Daily Contemplation Message -->
    <section class="card" style="border-left:4px solid var(--accent-red);">
      <h4 style="margin:0 0 0.35rem;">💡 Lời nhắn chiêm nghiệm trong ngày</h4>
      <p style="margin:0;font-family:var(--font-serif);font-style:italic;font-size:1.02rem;">
        "${esc(pred.dailyNoteText)}"
      </p>
      <p style="margin:0.4rem 0 0;font-size:0.78rem;color:var(--text-muted);">
        ${esc(pred.disclaimerText)}
      </p>
    </section>
  `;

  // Bind interactions
  const shiftDate = (deltaDays: number) => {
    const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
    const ny = dt.getUTCFullYear();
    const nm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const nd = String(dt.getUTCDate()).padStart(2, '0');
    state.dateStr = `${ny}-${nm}-${nd}`;
    renderTodayScreen(container, state, profile, settings, onNavigateTool);
  };

  container.querySelector('#btn-prev-day')?.addEventListener('click', () => shiftDate(-1));
  container.querySelector('#btn-next-day')?.addEventListener('click', () => shiftDate(1));
  container.querySelector('#btn-jump-today')?.addEventListener('click', () => {
    const now = new Date(Date.now() + settings.tzOffsetMinutes * 60_000);
    state.dateStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    renderTodayScreen(container, state, profile, settings, onNavigateTool);
  });

  container.querySelector('#today-date-input')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLInputElement).value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      state.dateStr = val;
      renderTodayScreen(container, state, profile, settings, onNavigateTool);
    }
  });

  container.querySelector('#btn-open-journal')?.addEventListener('click', () => {
    onNavigateTool('journal');
  });

  container.querySelector('#btn-share-png')?.addEventListener('click', () => {
    exportDailyShareCardPng(pred);
  });

  // Toggle "Vì sao?" panels
  container.querySelectorAll('.toggle-explain-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      if (!targetId) return;
      const panel = document.getElementById(targetId);
      if (!panel) return;
      const isHidden = panel.hasAttribute('hidden');
      if (isHidden) {
        panel.removeAttribute('hidden');
        btn.setAttribute('aria-expanded', 'true');
      } else {
        panel.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Hour slot clicks
  container.querySelectorAll('[data-hour-branch]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const b = Number(btn.getAttribute('data-hour-branch'));
      if (!Number.isNaN(b)) {
        state.selectedHourBranch = b;
        renderTodayScreen(container, state, profile, settings, onNavigateTool);
      }
    });
  });

  // Compass layer & orientation & sector clicks
  container.querySelectorAll('[data-compass-layer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.compassLayer = btn.getAttribute('data-compass-layer') as CompassLayer;
      renderTodayScreen(container, state, profile, settings, onNavigateTool);
    });
  });

  container.querySelector('[data-compass-toggle-orient]')?.addEventListener('click', () => {
    state.southAtTop = !state.southAtTop;
    renderTodayScreen(container, state, profile, settings, onNavigateTool);
  });

  container.querySelectorAll('[data-compass-dir]').forEach((el) => {
    el.addEventListener('click', () => {
      state.selectedDir = el.getAttribute('data-compass-dir') as BaguaDir;
      renderTodayScreen(container, state, profile, settings, onNavigateTool);
    });
  });
}
