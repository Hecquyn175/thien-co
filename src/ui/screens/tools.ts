import { buildBaziChart, type Profile } from '../../core/bazi/chart';
import {
  profileRepo,
  journalRepo,
  divinationRepo,
  computeJournalStats,
  type AppSettings,
  type JournalEntry,
} from '../../storage';
import { PURPOSES, type PurposeId } from '../../core/picker/purposes';
import { runRankDatesInWorker } from '../../workers/client';
import { evaluateCompatibility } from '../../core/compat/compat';
import {
  castMaiHoaByTime,
  castThreeCoins,
  getDailyHexagram,
  type IChingCastResult,
} from '../../core/iching/cast';
import { HEXAGRAMS } from '../../core/iching/hexagrams';
import { predictDayEvents } from '../../core/events';
import ganzhiData from '../../data/ganzhi.json';
import nayinData from '../../data/nayin.json';
import trucData from '../../data/truc.json';
import tu28Data from '../../data/tu28.json';
import glossaryData from '../../data/glossary.json';
import { esc } from '../utils';

export type ToolSubTab = 'picker' | 'compat' | 'iching' | 'journal' | 'encyclopedia';

export interface ToolsScreenState {
  activeSubTab: ToolSubTab;
  // Picker state
  purposeId: PurposeId;
  rangeDays: 7 | 30 | 60 | 90 | 180;
  secondProfileId: string;
  // Compat state
  compatProfileAId: string;
  compatProfileBId: string;
  // IChing state
  ichingQuestion: string;
  lastCast: IChingCastResult | null;
  // Journal state
  journalDateStr: string;
  // Encyclopedia state
  searchQuery: string;
  encCategory: 'glossary' | 'hexagrams' | 'nayin' | 'truc_tu';
}

export async function renderToolsScreen(
  container: HTMLElement,
  state: ToolsScreenState,
  activeProfile: Profile | null,
  settings: AppSettings,
  onOpenDateInToday: (dateStr: string) => void,
): Promise<void> {
  const allProfiles = await profileRepo.getAll();

  const tabBarHtml = `
    <div class="tab-bar" role="tablist">
      <button type="button" class="tab-btn ${state.activeSubTab === 'picker' ? 'active' : ''}" data-tool-tab="picker">📅 Chọn ngày tốt</button>
      <button type="button" class="tab-btn ${state.activeSubTab === 'compat' ? 'active' : ''}" data-tool-tab="compat">🤝 Hợp tuổi / Hợp mệnh</button>
      <button type="button" class="tab-btn ${state.activeSubTab === 'iching' ? 'active' : ''}" data-tool-tab="iching">☯️ Gieo quẻ Kinh Dịch</button>
      <button type="button" class="tab-btn ${state.activeSubTab === 'journal' ? 'active' : ''}" data-tool-tab="journal">📓 Nhật ký & Đối chiếu</button>
      <button type="button" class="tab-btn ${state.activeSubTab === 'encyclopedia' ? 'active' : ''}" data-tool-tab="encyclopedia">📚 Tra cứu & Chú giải</button>
    </div>
    <div id="tool-subcontent"></div>
  `;

  container.innerHTML = tabBarHtml;

  container.querySelectorAll('[data-tool-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeSubTab = btn.getAttribute('data-tool-tab') as ToolSubTab;
      renderToolsScreen(container, state, activeProfile, settings, onOpenDateInToday);
    });
  });

  const sub = container.querySelector('#tool-subcontent') as HTMLElement;

  if (state.activeSubTab === 'picker') {
    await renderPickerTool(sub, state, activeProfile, allProfiles, settings, onOpenDateInToday);
  } else if (state.activeSubTab === 'compat') {
    await renderCompatTool(sub, state, activeProfile, allProfiles, settings);
  } else if (state.activeSubTab === 'iching') {
    await renderIChingTool(sub, state, activeProfile, settings);
  } else if (state.activeSubTab === 'journal') {
    await renderJournalTool(sub, state, activeProfile, settings);
  } else {
    renderEncyclopediaTool(sub, state);
  }
}

async function renderPickerTool(
  sub: HTMLElement,
  state: ToolsScreenState,
  activeProfile: Profile | null,
  allProfiles: Profile[],
  settings: AppSettings,
  onOpenDateInToday: (dateStr: string) => void,
): Promise<void> {
  sub.innerHTML = `
    <section class="card">
      <h2 class="card-title">📅 Chọn ngày đẹp theo mục đích (Cá nhân hóa)</h2>
      <p style="font-size:0.88rem;color:var(--text-secondary);">
        Hệ thống chấm điểm từng ngày trên nền Lịch Vạn Niên (Trực, Tú, Hoàng đạo, Thần sát) kết hợp với Tứ Trụ & Dụng Thần của hồ sơ đang chọn.
      </p>
      <div class="grid-2" style="margin-bottom:0.85rem;">
        <div>
          <label for="picker-purpose">Mục đích công việc</label>
          <select id="picker-purpose">
            ${PURPOSES.map(
              (p) =>
                `<option value="${esc(p.id)}" ${p.id === state.purposeId ? 'selected' : ''}>${esc(p.vi)}</option>`,
            ).join('')}
          </select>
        </div>
        <div>
          <label for="picker-range">Khoảng thời gian tìm kiếm</label>
          <select id="picker-range">
            ${[7, 30, 60, 90, 180]
              .map(
                (r) =>
                  `<option value="${r}" ${r === state.rangeDays ? 'selected' : ''}>Trong ${r} ngày tới</option>`,
              )
              .join('')}
          </select>
        </div>
      </div>

      <div style="margin-bottom:0.85rem;">
        <label for="picker-prof2">Hồ sơ người thứ hai (Tùy chọn cho Cưới hỏi / Động thổ / Ký kết)</label>
        <select id="picker-prof2">
          <option value="">-- Không dùng hồ sơ thứ 2 --</option>
          ${allProfiles
            .filter((p) => p.id !== activeProfile?.id)
            .map(
              (p) =>
                `<option value="${esc(p.id)}" ${p.id === state.secondProfileId ? 'selected' : ''}>${esc(p.name)} (${esc(p.birth.datetime.slice(0, 10))})</option>`,
            )
            .join('')}
        </select>
      </div>

      <button type="button" class="btn btn-primary" id="btn-run-picker">🔍 Tìm Top 5 ngày tốt nhất</button>
    </section>
    <div id="picker-results"></div>
  `;

  const runSearch = async () => {
    const resBox = sub.querySelector('#picker-results') as HTMLElement;
    resBox.innerHTML = `<div class="card"><p>⏳ Đang quét và xếp hạng ${state.rangeDays} ngày qua Web Worker...</p></div>`;

    const secondProfile =
      allProfiles.find((p) => p.id === state.secondProfileId) ?? null;

    const result = await runRankDatesInWorker({
      purposeId: state.purposeId,
      startInstant: Date.now(),
      rangeDays: state.rangeDays,
      tzOffsetMinutes: settings.tzOffsetMinutes,
      ziConvention: settings.ziHourConvention,
      profile: activeProfile,
      secondProfile,
    });

    resBox.innerHTML = `
      <section class="card">
        <h3 class="card-title">🏆 Top 5 ngày đẹp nhất cho: ${esc(result.purpose.vi)}</h3>
        ${result.topDays
          .map(
            (day, i) => `
            <div class="event-card dir-thuan" style="margin-bottom:0.75rem;">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
                <div>
                  <strong style="font-size:1.05rem;">#${i + 1} • Dương lịch: ${esc(day.dateISO)}</strong>
                  <span style="color:var(--text-secondary);font-size:0.88rem;margin-left:0.4rem;">
                    (${esc(day.lunarVi)} • Ngày ${esc(day.dayPillarVi)})
                  </span>
                </div>
                <div style="display:flex;align-items:center;gap:0.45rem;">
                  <span class="badge badge-good">Điểm: ${day.score}/100</span>
                  <button type="button" class="btn btn-sm" data-open-picked="${esc(day.dateISO)}">Mở xem</button>
                </div>
              </div>
              <ul style="margin:0.45rem 0;padding-left:1.2rem;font-size:0.86rem;color:var(--text-secondary);">
                ${day.reasons.map((r) => `<li>✅ ${esc(r)}</li>`).join('')}
                ${day.avoidReasons.map((c) => `<li style="color:var(--status-warn);">⚠️ ${esc(c)}</li>`).join('')}
              </ul>
              <div style="font-size:0.84rem;background:var(--bg-card);padding:0.45rem 0.65rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);">
                <strong>🕒 3 Giờ tốt nhất trong ngày:</strong>
                ${day.top3Hours.map((h) => `Giờ ${esc(h.branchVi)} (${esc(h.hoursLabel)} - ${esc(h.deity.vi)})`).join(' • ')}
              </div>
            </div>
          `,
          )
          .join('')}
      </section>

      <section class="card">
        <h3 class="card-title">⚠️ Các ngày đại kỵ nên tránh trong khoảng này (${result.avoidDays.length} ngày)</h3>
        <div style="display:grid;gap:0.45rem;max-height:260px;overflow-y:auto;">
          ${
            result.avoidDays.length > 0
              ? result.avoidDays
                  .map(
                    (ad) => `
                    <div style="padding:0.5rem 0.75rem;background:var(--status-bad-bg);border-radius:var(--radius-sm);font-size:0.85rem;display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.4rem;">
                      <strong>${esc(ad.dateISO)} (${esc(ad.lunarVi)})</strong>
                      <span>${esc(ad.avoidReasons.join(' • '))}</span>
                    </div>
                  `,
                  )
                  .join('')
              : '<p>Không có ngày phạm đại sát trong khoảng ngắn này.</p>'
          }
        </div>
      </section>
    `;

    resBox.querySelectorAll('[data-open-picked]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dt = btn.getAttribute('data-open-picked');
        if (dt) onOpenDateInToday(dt);
      });
    });
  };

  sub.querySelector('#picker-purpose')?.addEventListener('change', (e) => {
    state.purposeId = (e.target as HTMLSelectElement).value as PurposeId;
  });
  sub.querySelector('#picker-range')?.addEventListener('change', (e) => {
    state.rangeDays = Number((e.target as HTMLSelectElement).value) as ToolsScreenState['rangeDays'];
  });
  sub.querySelector('#picker-prof2')?.addEventListener('change', (e) => {
    state.secondProfileId = (e.target as HTMLSelectElement).value;
  });
  sub.querySelector('#btn-run-picker')?.addEventListener('click', runSearch);

  await runSearch();
}

async function renderCompatTool(
  sub: HTMLElement,
  state: ToolsScreenState,
  activeProfile: Profile | null,
  allProfiles: Profile[],
  settings: AppSettings,
): Promise<void> {
  if (allProfiles.length < 2) {
    sub.innerHTML = `
      <section class="card">
        <h2 class="card-title">🤝 Xem Hợp Tuổi / Hợp Mệnh Hai Hồ Sơ</h2>
        <p>Hiện tại bạn mới có <strong>${allProfiles.length}</strong> hồ sơ. Hãy vào mục <strong>Hồ sơ & Cài đặt</strong> để tạo ít nhất 2 hồ sơ (ví dụ: bạn và người thương / đối tác) để đối chiếu toàn diện Tứ Trụ, Nạp Âm, Dụng Thần và Mệnh Quái.</p>
      </section>
    `;
    return;
  }

  if (!state.compatProfileAId) {
    state.compatProfileAId = activeProfile?.id ?? allProfiles[0].id;
  }
  if (!state.compatProfileBId || state.compatProfileBId === state.compatProfileAId) {
    const other = allProfiles.find((p) => p.id !== state.compatProfileAId) ?? allProfiles[0];
    state.compatProfileBId = other.id;
  }

  const profA = allProfiles.find((p) => p.id === state.compatProfileAId) ?? allProfiles[0];
  const profB = allProfiles.find((p) => p.id === state.compatProfileBId) ?? allProfiles[1];

  const chartA = buildBaziChart(profA, settings.ziHourConvention);
  const chartB = buildBaziChart(profB, settings.ziHourConvention);
  const compat = evaluateCompatibility(
    chartA,
    chartB,
    Date.now(),
    settings.tzOffsetMinutes,
  );

  sub.innerHTML = `
    <section class="card">
      <h2 class="card-title">🤝 Đối chiếu Tương hợp Bát Tự & Mệnh Quái</h2>
      <div class="grid-2" style="margin-bottom:1rem;">
        <div>
          <label for="compat-a">Hồ sơ thứ nhất</label>
          <select id="compat-a">
            ${allProfiles
              .map(
                (p) =>
                  `<option value="${esc(p.id)}" ${p.id === profA.id ? 'selected' : ''}>${esc(p.name)} (${esc(p.birth.datetime.slice(0, 10))})</option>`,
              )
              .join('')}
          </select>
        </div>
        <div>
          <label for="compat-b">Hồ sơ thứ hai</label>
          <select id="compat-b">
            ${allProfiles
              .map(
                (p) =>
                  `<option value="${esc(p.id)}" ${p.id === profB.id ? 'selected' : ''}>${esc(p.name)} (${esc(p.birth.datetime.slice(0, 10))})</option>`,
              )
              .join('')}
          </select>
        </div>
      </div>

      <div style="padding:1rem;background:var(--bg-elevated);border-radius:var(--radius-md);margin-bottom:1rem;text-align:center;">
        <div style="font-size:2rem;font-family:var(--font-serif);font-weight:700;color:var(--accent-red);">
          ${compat.overallScore} / 100 — ${esc(compat.summaryLabelVi)}
        </div>
        <div class="grid-4" style="margin-top:0.75rem;">
          <div class="pillar-box">
            <div class="pillar-label">Tình cảm / Tri kỷ</div>
            <div class="pillar-main">${compat.domains.tinhCam.score}/100</div>
          </div>
          <div class="pillar-box">
            <div class="pillar-label">Hợp tác làm ăn</div>
            <div class="pillar-main">${compat.domains.lamAn.score}/100</div>
          </div>
          <div class="pillar-box">
            <div class="pillar-label">Sống chung / Gia đạo</div>
            <div class="pillar-main">${compat.domains.songChung.score}/100</div>
          </div>
          <div class="pillar-box">
            <div class="pillar-label">Số lớp đối chiếu</div>
            <div class="pillar-main">7 lớp</div>
          </div>
        </div>
      </div>

      <div style="padding:0.75rem 0.9rem;background:var(--status-good-bg);border-left:4px solid var(--status-good);border-radius:var(--radius-sm);margin-bottom:1rem;">
        <strong>🌟 Gợi ý hôm nay hai người nên cùng làm gì:</strong>
        <ul style="margin:0.35rem 0 0;padding-left:1.2rem;">
          ${compat.todayTogetherSuggestions.map((s) => `<li>${esc(s)}</li>`).join('')}
        </ul>
      </div>

      <h4>Chi tiết 7 lớp tương tác mệnh lý:</h4>
      <div style="display:grid;gap:0.55rem;">
        ${Object.entries({
          'Nhật chủ (Can ngày)': compat.details.dayMasterRelation,
          'Nhật chi (Cung phối ngẫu)': compat.details.dayBranchRelation,
          'Niên chi (Tam hợp/Lục hợp tuổi)': compat.details.yearBranchRelation,
          'Nạp âm niên mệnh': compat.details.nayinRelation,
          'Ngũ hành bù khuyết': compat.details.elementComplement,
          'Dụng thần bổ trợ': compat.details.usefulGodSynergy,
          'Mệnh quái (Đông/Tây tứ mệnh)': compat.details.menhQuaiRelation,
        })
          .map(
            ([title, desc]) => `
            <div style="padding:0.65rem 0.85rem;background:var(--bg-page);border:1px solid var(--border-color);border-radius:var(--radius-sm);">
              <strong>${esc(title)}:</strong> ${esc(desc)}
            </div>
          `,
          )
          .join('')}
      </div>
    </section>
  `;

  sub.querySelector('#compat-a')?.addEventListener('change', (e) => {
    state.compatProfileAId = (e.target as HTMLSelectElement).value;
    renderCompatTool(sub, state, activeProfile, allProfiles, settings);
  });
  sub.querySelector('#compat-b')?.addEventListener('change', (e) => {
    state.compatProfileBId = (e.target as HTMLSelectElement).value;
    renderCompatTool(sub, state, activeProfile, allProfiles, settings);
  });
}

async function renderIChingTool(
  sub: HTMLElement,
  state: ToolsScreenState,
  activeProfile: Profile | null,
  settings: AppSettings,
): Promise<void> {
  const history = await divinationRepo.getAll();

  sub.innerHTML = `
    <section class="card">
      <h2 class="card-title">☯️ Gieo Quẻ Kinh Dịch (64 Quẻ Chu Dịch)</h2>
      <p style="font-size:0.88rem;color:var(--text-secondary);">
        Tĩnh tâm nghĩ về việc cần hỏi, nhập câu hỏi (tùy chọn) và chọn một trong 3 phương pháp lập quẻ truyền thống.
      </p>
      <div style="margin-bottom:0.75rem;">
        <label for="iching-q">Việc cần hỏi / Chủ đề chiêm nghiệm</label>
        <input id="iching-q" type="text" placeholder="Ví dụ: Dự án sắp tới cần lưu ý điều gì?" value="${esc(state.ichingQuestion)}" />
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button type="button" class="btn btn-primary" id="btn-cast-coins">🪙 Gieo 3 đồng xu (6 lần)</button>
        <button type="button" class="btn" id="btn-cast-maihoa">🌸 Mai Hoa Dịch Số (Theo giờ)</button>
        <button type="button" class="btn" id="btn-cast-daily">☀️ Quẻ ứng trong ngày</button>
      </div>
    </section>

    <div id="iching-result-box"></div>

    <section class="card">
      <h3 class="card-title">📜 Lịch sử gieo quẻ đã lưu trên thiết bị (${history.length})</h3>
      <div style="display:grid;gap:0.5rem;max-height:280px;overflow-y:auto;">
        ${
          history.length > 0
            ? history
                .slice(0, 12)
                .map(
                  (rec) => `
                  <div style="padding:0.55rem 0.75rem;background:var(--bg-page);border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.85rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4rem;">
                    <div>
                      <strong>${esc(rec.question || 'Không ghi câu hỏi')}</strong>
                      <span style="color:var(--text-secondary);"> — Quẻ #${rec.result.primary.number} ${esc(rec.result.primary.vi)} → #${rec.result.changed.number} ${esc(rec.result.changed.vi)} (${esc(rec.result.method)})</span>
                    </div>
                    <small style="color:var(--text-muted);">${new Date(rec.createdAt).toLocaleString('vi-VN')}</small>
                  </div>
                `,
                )
                .join('')
            : '<p style="color:var(--text-secondary);font-size:0.88rem;">Chưa có lịch sử gieo quẻ.</p>'
        }
      </div>
    </section>
  `;

  const renderCastResult = (res: IChingCastResult) => {
    const box = sub.querySelector('#iching-result-box') as HTMLElement;
    const p = res.primary;
    const m = res.mutual;
    const c = res.changed;

    // Render 6 lines top-to-bottom (line 6 down to line 1)
    const lineChars = p.lines.split('');
    const linesSvg = [5, 4, 3, 2, 1, 0]
      .map((idx) => {
        const lineNum = idx + 1;
        const isYang = lineChars[idx] === '1';
        const isMoving = res.movingLines.includes(lineNum);
        const coinVal = res.coinValues ? res.coinValues[idx] : null;
        return `
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:6px;">
            <span style="font-size:0.78rem;width:52px;color:var(--text-secondary);">Hào ${lineNum}</span>
            <div style="flex:1;max-width:180px;display:flex;justify-content:space-between;align-items:center;">
              ${
                isYang
                  ? `<div style="width:100%;height:12px;background:${isMoving ? 'var(--accent-red)' : 'var(--text-primary)'};border-radius:2px;"></div>`
                  : `<div style="width:44%;height:12px;background:${isMoving ? 'var(--accent-red)' : 'var(--text-primary)'};border-radius:2px;"></div>
                     <div style="width:44%;height:12px;background:${isMoving ? 'var(--accent-red)' : 'var(--text-primary)'};border-radius:2px;"></div>`
              }
            </div>
            <span style="font-size:0.78rem;color:${isMoving ? 'var(--accent-red)' : 'var(--text-muted)'};font-weight:${isMoving ? '700' : '400'};">
              ${isMoving ? (isYang ? '● Hào Dương Động' : '✕ Hào Âm Động') : isYang ? 'Dương Tĩnh' : 'Âm Tĩnh'}${coinVal ? ` (${coinVal})` : ''}
            </span>
          </div>
        `;
      })
      .join('');

    box.innerHTML = `
      <section class="card" style="border:2px solid var(--accent-gold);">
        <div class="card-header">
          <h3 class="card-title">
            Kết quả: Quẻ #${p.number} ${esc(p.vi)} <span class="cjk">(${esc(p.han)})</span>
          </h3>
          <span class="badge badge-warn">Hào động: ${res.movingLines.length > 0 ? res.movingLines.join(', ') : 'Không (Quẻ tĩnh)'}</span>
        </div>

        <div class="grid-2" style="margin-bottom:1rem;align-items:center;">
          <div style="background:var(--bg-elevated);padding:0.85rem;border-radius:var(--radius-sm);">
            ${linesSvg}
          </div>
          <div>
            <p style="margin:0 0 0.4rem;"><strong>Thoán từ / Lời quẻ:</strong> ${esc(p.judgement)}</p>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.6rem;">
              <span class="badge badge-good">Quẻ Hỗ: #${m.number} ${esc(m.vi)} (${esc(m.han)})</span>
              <span class="badge badge-warn">Quẻ Biến: #${c.number} ${esc(c.vi)} (${esc(c.han)})</span>
            </div>
          </div>
        </div>

        <h4>Ứng dụng vào 4 phương diện:</h4>
        <div class="grid-2" style="font-size:0.88rem;">
          <div class="pillar-box" style="text-align:left;">
            <strong>🤝 Quan hệ & Con người:</strong><br/>${esc(p.meaning.nguoi)}
          </div>
          <div class="pillar-box" style="text-align:left;">
            <strong>💰 Tài chính & Tiền bạc:</strong><br/>${esc(p.meaning.tien_bac)}
          </div>
          <div class="pillar-box" style="text-align:left;">
            <strong>📑 Công việc & Học tập:</strong><br/>${esc(p.meaning.cong_viec)}
          </div>
          <div class="pillar-box" style="text-align:left;">
            <strong>🧭 Sức khỏe & Di chuyển:</strong><br/>${esc(p.meaning.suc_khoe_di_chuyen)}
          </div>
        </div>
      </section>
    `;
  };

  if (state.lastCast) {
    renderCastResult(state.lastCast);
  }

  const saveAndRender = async (res: IChingCastResult) => {
    state.lastCast = res;
    const qInput = sub.querySelector('#iching-q') as HTMLInputElement;
    state.ichingQuestion = qInput?.value.trim() ?? '';
    await divinationRepo.save({
      id: `div-${Date.now()}`,
      createdAt: Date.now(),
      question: state.ichingQuestion,
      result: res,
    });
    await renderIChingTool(sub, state, activeProfile, settings);
  };

  sub.querySelector('#btn-cast-coins')?.addEventListener('click', () => {
    const qInput = sub.querySelector('#iching-q') as HTMLInputElement;
    const q = qInput?.value.trim() || '';
    const res = castThreeCoins(Date.now(), q);
    saveAndRender(res);
  });

  sub.querySelector('#btn-cast-maihoa')?.addEventListener('click', () => {
    const qInput = sub.querySelector('#iching-q') as HTMLInputElement;
    const q = qInput?.value.trim() || '';
    const res = castMaiHoaByTime(Date.now(), settings.tzOffsetMinutes, q);
    saveAndRender(res);
  });

  sub.querySelector('#btn-cast-daily')?.addEventListener('click', () => {
    const res = getDailyHexagram(
      Date.now(),
      settings.tzOffsetMinutes,
      activeProfile?.id ?? 'no_profile',
    );
    saveAndRender(res);
  });
}

async function renderJournalTool(
  sub: HTMLElement,
  state: ToolsScreenState,
  activeProfile: Profile | null,
  settings: AppSettings,
): Promise<void> {
  const profId = activeProfile?.id ?? 'no_profile';
  const existing = await journalRepo.getByDateAndProfile(state.journalDateStr, profId);
  const allEntries = await journalRepo.getAll();
  const stats = computeJournalStats(allEntries);

  const [y, m, d] = state.journalDateStr.split('-').map(Number);
  const instant = Date.UTC(y, m - 1, d, 12, 0, 0) - settings.tzOffsetMinutes * 60_000;
  const chart = activeProfile
    ? buildBaziChart(activeProfile, settings.ziHourConvention)
    : undefined;
  const pred = predictDayEvents(instant, chart, {
    tzOffsetMinutes: settings.tzOffsetMinutes,
    ziHourConvention: settings.ziHourConvention,
  });

  const allPredCards = [
    ...pred.groups.nguoi,
    ...pred.groups.tien_bac,
    ...pred.groups.cong_viec,
    ...pred.groups.suc_khoe_di_chuyen,
  ];

  const r = existing?.groupRatings ?? {
    nguoi: 3,
    tien_bac: 3,
    cong_viec: 3,
    suc_khoe_di_chuyen: 3,
  };
  const checkedSet = new Set(existing?.occurredEventIds ?? []);

  sub.innerHTML = `
    <section class="card">
      <div class="card-header">
        <h2 class="card-title">📓 Nhật ký cuối ngày & Đối chiếu thực tế</h2>
        <input type="date" id="journal-date" value="${esc(state.journalDateStr)}" style="width:auto;min-height:38px;" />
      </div>
      <p style="font-size:0.88rem;color:var(--text-secondary);">
        Chấm điểm trải nghiệm thực tế của bạn (1 = Rất căng thẳng, 5 = Rất thuận lợi) và đánh dấu các sự kiện đã thực sự diễn ra để đối chiếu với dự đoán.
      </p>

      <div class="grid-2" style="margin-bottom:0.85rem;">
        <div>
          <label for="jr-nguoi">🤝 Quan hệ & Con người (1–5)</label>
          <input id="jr-nguoi" type="number" min="1" max="5" value="${r.nguoi}" />
        </div>
        <div>
          <label for="jr-tien">💰 Tài chính & Tiền bạc (1–5)</label>
          <input id="jr-tien" type="number" min="1" max="5" value="${r.tien_bac}" />
        </div>
        <div>
          <label for="jr-viec">📑 Công việc & Giấy tờ (1–5)</label>
          <input id="jr-viec" type="number" min="1" max="5" value="${r.cong_viec}" />
        </div>
        <div>
          <label for="jr-sk">🧭 Sức khỏe & Di chuyển (1–5)</label>
          <input id="jr-sk" type="number" min="1" max="5" value="${r.suc_khoe_di_chuyen}" />
        </div>
      </div>

      <div style="margin-bottom:0.85rem;">
        <label>Đánh dấu sự kiện dự đoán đã xảy ra trong ngày ${esc(state.journalDateStr)}:</label>
        <div style="display:grid;gap:0.4rem;background:var(--bg-page);padding:0.65rem;border-radius:var(--radius-sm);border:1px solid var(--border-color);">
          ${allPredCards
            .map(
              (ev) => `
              <label style="display:flex;align-items:center;gap:0.5rem;margin:0;font-weight:400;cursor:pointer;">
                <input type="checkbox" class="jr-ev-check" value="${esc(ev.id)}" ${checkedSet.has(ev.id) ? 'checked' : ''} style="width:18px;min-height:18px;" />
                <span><strong>${esc(ev.title)}:</strong> ${esc(ev.situationText)}</span>
              </label>
            `,
            )
            .join('')}
        </div>
      </div>

      <div style="margin-bottom:0.85rem;">
        <label for="jr-note">Ghi chú cá nhân trong ngày</label>
        <textarea id="jr-note" rows="3" placeholder="Ghi lại sự việc đáng nhớ hoặc bài học rút ra...">${esc(existing?.note ?? '')}</textarea>
      </div>

      <button type="button" class="btn btn-primary" id="btn-save-journal">💾 Lưu nhật ký ngày ${esc(state.journalDateStr)}</button>
      <span id="jr-save-msg" style="margin-left:0.6rem;font-size:0.86rem;color:var(--status-good);"></span>
    </section>

    <section class="card">
      <h3 class="card-title">📊 Thống kê đối chiếu trên máy (${stats.totalDaysLogged} ngày đã ghi)</h3>
      <div class="grid-4">
        <div class="pillar-box">
          <div class="pillar-label">TB Con người</div>
          <div class="pillar-main">${stats.groupAvgRating.nguoi}/5</div>
        </div>
        <div class="pillar-box">
          <div class="pillar-label">TB Tiền bạc</div>
          <div class="pillar-main">${stats.groupAvgRating.tien_bac}/5</div>
        </div>
        <div class="pillar-box">
          <div class="pillar-label">TB Công việc</div>
          <div class="pillar-main">${stats.groupAvgRating.cong_viec}/5</div>
        </div>
        <div class="pillar-box">
          <div class="pillar-label">TB Sức khỏe</div>
          <div class="pillar-main">${stats.groupAvgRating.suc_khoe_di_chuyen}/5</div>
        </div>
      </div>
      <p style="margin:0.65rem 0 0;font-size:0.88rem;color:var(--text-secondary);">
        Sự kiện xác nhận khớp: <strong>${stats.totalConfirmedEvents}/${stats.totalPredictedEvents}</strong> (${stats.matchRatePercent}%).
      </p>
    </section>
  `;

  sub.querySelector('#journal-date')?.addEventListener('change', (e) => {
    state.journalDateStr = (e.target as HTMLInputElement).value;
    renderJournalTool(sub, state, activeProfile, settings);
  });

  sub.querySelector('#btn-save-journal')?.addEventListener('click', async () => {
    const checkedIds: string[] = [];
    sub.querySelectorAll('.jr-ev-check:checked').forEach((el) => {
      checkedIds.push((el as HTMLInputElement).value);
    });

    const entry: JournalEntry = {
      id: `${state.journalDateStr}:${profId}`,
      dateISO: state.journalDateStr,
      profileId: profId,
      groupRatings: {
        nguoi: Number((sub.querySelector('#jr-nguoi') as HTMLInputElement).value) || 3,
        tien_bac: Number((sub.querySelector('#jr-tien') as HTMLInputElement).value) || 3,
        cong_viec: Number((sub.querySelector('#jr-viec') as HTMLInputElement).value) || 3,
        suc_khoe_di_chuyen: Number((sub.querySelector('#jr-sk') as HTMLInputElement).value) || 3,
      },
      predictedEventIds: allPredCards.map((c) => c.id),
      occurredEventIds: checkedIds,
      note: (sub.querySelector('#jr-note') as HTMLTextAreaElement).value.trim(),
      updatedAt: Date.now(),
    };
    await journalRepo.save(entry);
    const msg = sub.querySelector('#jr-save-msg');
    if (msg) msg.textContent = '✓ Đã lưu thành công!';
    setTimeout(() => renderJournalTool(sub, state, activeProfile, settings), 600);
  });
}

function renderEncyclopediaTool(sub: HTMLElement, state: ToolsScreenState): void {
  const q = state.searchQuery.trim().toLowerCase();

  let listHtml = '';
  if (state.encCategory === 'glossary') {
    const filtered = glossaryData.terms.filter(
      (t) =>
        !q ||
        t.term.toLowerCase().includes(q) ||
        t.short.toLowerCase().includes(q),
    );
    listHtml = `
      <p style="font-size:0.85rem;color:var(--text-secondary);">Hiển thị ${filtered.length} / ${glossaryData.terms.length} thuật ngữ:</p>
      <div style="display:grid;gap:0.55rem;max-height:520px;overflow-y:auto;">
        ${filtered
          .slice(0, 80)
          .map(
            (t) => `
            <div style="padding:0.65rem 0.85rem;background:var(--bg-page);border:1px solid var(--border-color);border-radius:var(--radius-sm);">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong>${esc(t.term)} ${t.han ? `<span class="cjk">(${esc(t.han)})</span>` : ''}</strong>
                <span class="badge badge-warn">${esc(t.category)}</span>
              </div>
              <div style="font-size:0.88rem;margin-top:0.25rem;">${esc(t.short)}</div>
            </div>
          `,
          )
          .join('')}
      </div>
    `;
  } else if (state.encCategory === 'hexagrams') {
    const filtered = HEXAGRAMS.filter(
      (h) =>
        !q ||
        h.vi.toLowerCase().includes(q) ||
        h.judgement.toLowerCase().includes(q),
    );
    listHtml = `
      <div style="display:grid;gap:0.55rem;max-height:520px;overflow-y:auto;">
        ${filtered
          .map(
            (h) => `
            <div style="padding:0.65rem 0.85rem;background:var(--bg-page);border:1px solid var(--border-color);border-radius:var(--radius-sm);">
              <strong>Quẻ #${h.number}: ${esc(h.vi)} <span class="cjk">(${esc(h.han)})</span></strong>
              <div style="font-size:0.86rem;margin-top:0.25rem;"><strong>Thoán từ:</strong> ${esc(h.judgement)}</div>
            </div>
          `,
          )
          .join('')}
      </div>
    `;
  } else if (state.encCategory === 'nayin') {
    const filtered = nayinData.pairs.filter(
      (n) =>
        !q ||
        n.vi.toLowerCase().includes(q) ||
        n.stems.join(' ').toLowerCase().includes(q),
    );
    listHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:0.5rem;max-height:520px;overflow-y:auto;">
        ${filtered
          .map(
            (n, idx) => `
            <div style="padding:0.55rem 0.75rem;background:var(--bg-page);border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.85rem;">
              <strong>#${idx + 1} ${esc(n.stems.join(' / '))}</strong><br/>
              <span>${esc(n.vi)} <span class="cjk">(${esc(n.han)})</span></span>
            </div>
          `,
          )
          .join('')}
      </div>
    `;
  } else {
    listHtml = `
      <h4>10 Thiên Can & 12 Địa Chi</h4>
      <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:1rem;">
        ${ganzhiData.stems.map((s) => `<span class="badge badge-warn">${esc(s.vi)} (${esc(s.han)}) - ${esc(s.element)}</span>`).join('')}
        ${ganzhiData.branches.map((b) => `<span class="badge badge-good">${esc(b.vi)} (${esc(b.han)}) - ${esc(b.animal)}</span>`).join('')}
      </div>
      <h4>12 Trực (Kiến Trừ Thập Nhị Khách)</h4>
      <div style="display:grid;gap:0.45rem;margin-bottom:1rem;">
        ${trucData.items
          .map(
            (t) => `
            <div style="padding:0.5rem;background:var(--bg-page);border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.85rem;">
              <strong>Trực ${esc(t.vi)} (${esc(t.han)})</strong> — ${esc(t.summary)}
            </div>
          `,
          )
          .join('')}
      </div>
      <h4>28 Sao (Nhị Thập Bát Tú)</h4>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:0.45rem;">
        ${tu28Data.items
          .map(
            (s) => `
            <div style="padding:0.5rem;background:var(--bg-page);border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.84rem;">
              <strong>Sao ${esc(s.vi)} (${esc(s.han)})</strong> - ${esc(s.fullVi)} (${esc(s.rating)})
            </div>
          `,
          )
          .join('')}
      </div>
    `;
  }

  sub.innerHTML = `
    <section class="card">
      <div class="card-header">
        <h2 class="card-title">📚 Bách khoa Tra cứu & Từ điển Thuật ngữ</h2>
        <a href="#/dev/fonts" class="btn btn-sm">🔤 Kiểm tra Font & Glyph (#/dev/fonts)</a>
      </div>

      <div style="display:flex;gap:0.45rem;flex-wrap:wrap;margin-bottom:0.75rem;">
        <button type="button" class="btn btn-sm ${state.encCategory === 'glossary' ? 'btn-primary' : ''}" data-enc-cat="glossary">Từ điển (${glossaryData.terms.length})</button>
        <button type="button" class="btn btn-sm ${state.encCategory === 'hexagrams' ? 'btn-primary' : ''}" data-enc-cat="hexagrams">64 Quẻ Dịch</button>
        <button type="button" class="btn btn-sm ${state.encCategory === 'nayin' ? 'btn-primary' : ''}" data-enc-cat="nayin">60 Hoa Giáp Nạp Âm</button>
        <button type="button" class="btn btn-sm ${state.encCategory === 'truc_tu' ? 'btn-primary' : ''}" data-enc-cat="truc_tu">Can Chi • 12 Trực • 28 Tú</button>
      </div>

      <div style="margin-bottom:0.85rem;">
        <input type="search" id="enc-search" placeholder="Nhập từ khóa tìm kiếm (ví dụ: Dụng thần, Thiên Ất, Thuần Càn, Hải Trung Kim...)" value="${esc(state.searchQuery)}" />
      </div>

      ${listHtml}
    </section>
  `;

  sub.querySelectorAll('[data-enc-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.encCategory = btn.getAttribute('data-enc-cat') as ToolsScreenState['encCategory'];
      renderEncyclopediaTool(sub, state);
    });
  });

  sub.querySelector('#enc-search')?.addEventListener('input', (e) => {
    state.searchQuery = (e.target as HTMLInputElement).value;
    renderEncyclopediaTool(sub, state);
  });
}
