import { APP_NAME } from '../../constants';
import { buildBaziChart, type Profile } from '../../core/bazi/chart';
import type { Gender } from '../../core/directions/menh-quai';
import { TEN_GOD_META } from '../../core/relations/ten-gods';
import { getNayinForPillar } from '../../core/ganzhi/nayin';
import {
  profileRepo,
  settingsRepo,
  exportAllData,
  importAllData,
  clearAllData,
  type AppSettings,
} from '../../storage';
import { lunarToSolarVN } from '../../core/time/lunar-vn';
import { renderFiveElementRadar } from '../components/radar';
import ganzhiData from '../../data/ganzhi.json';
import sourcesData from '../../data/sources.json';
import {
  esc,
  formatGanZhi,
  renderConfidenceBadge,
  renderElementBadge,
} from '../utils';

export async function renderProfileSettingsScreen(
  container: HTMLElement,
  activeProfile: Profile | null,
  settings: AppSettings,
  onStateChanged: () => void,
): Promise<void> {
  const profiles = await profileRepo.getAll();
  const showHan = settings.showHanChars;

  let baziHtml = `<p style="color:var(--text-secondary);">Chưa có hồ sơ cá nhân đang chọn. Hãy tạo hoặc chọn một hồ sơ bên dưới để xem Lá số Tứ Trụ (Bát Tự), Dụng Thần, Đại Vận và Mệnh Quái.</p>`;

  if (activeProfile) {
    const chart = buildBaziChart(activeProfile, settings.ziHourConvention);
    const strength = chart.strength;
    const useful = chart.usefulGod;
    const luck = chart.luckCycles;
    const menhQuai = chart.menhQuai;
    const currentYear = new Date().getFullYear();

    baziHtml = `
      <div style="margin-top:1rem;border-top:1px solid var(--border-color);padding-top:1rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.85rem;">
          <h3 style="margin:0;">📜 Lá số Bát Tự (Tứ Trụ): ${esc(activeProfile.name)}</h3>
          <div>
            ${renderElementBadge(strength.dayMasterElement, showHan)}
            <span class="badge badge-warn">Nhật chủ: ${esc(strength.labelVi)} (${strength.score}/100)</span>
          </div>
        </div>

        <div class="grid-4" style="margin-bottom:1rem;">
          ${[
            { label: 'Trụ Năm', p: chart.year, isDay: false },
            { label: 'Trụ Tháng', p: chart.month, isDay: false },
            { label: 'Trụ Ngày (Nhật Chủ)', p: chart.day, isDay: true },
            { label: 'Trụ Giờ', p: chart.hour, isDay: false },
          ]
            .map((col) => {
              if (!col.p) {
                return `
                  <div class="pillar-box">
                    <div class="pillar-label">${col.label}</div>
                    <div class="pillar-main" style="color:var(--text-muted);">Khuyết giờ</div>
                    <small style="color:var(--text-secondary);">Chưa rõ giờ sinh</small>
                  </div>
                `;
              }
              const tgVi = col.isDay
                ? 'Nhật Chủ'
                : TEN_GOD_META[col.p.stemTenGod]?.vi ?? col.p.stemTenGod;
              return `
                <div class="pillar-box">
                  <div class="pillar-label">${col.label} • ${esc(tgVi)}</div>
                  <div class="pillar-main">${formatGanZhi(col.p.pillar, showHan)}</div>
                  <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.25rem;">
                    Nạp âm: ${esc(col.p.nayin.vi)}
                  </div>
                  <div style="font-size:0.75rem;border-top:1px dashed var(--border-color);padding-top:0.25rem;">
                    <strong>Tàng can:</strong>
                    ${col.p.hiddenStems
                      .map((hs) => {
                        const sVi = ganzhiData.stems[hs.stem]?.vi ?? '';
                        const hTgVi = TEN_GOD_META[hs.tenGod]?.shortVi ?? hs.tenGod;
                        return `${esc(sVi)} (${esc(hTgVi)})`;
                      })
                      .join(', ')}
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>

        <div class="grid-2" style="margin-bottom:1rem;">
          <div style="background:var(--bg-elevated);padding:0.85rem;border-radius:var(--radius-sm);">
            <h4 style="margin:0 0 0.5rem;">Phân bố Ngũ Hành trong lá số</h4>
            ${renderFiveElementRadar(strength.elementDistribution, showHan)}
          </div>
          <div style="background:var(--bg-elevated);padding:0.85rem;border-radius:var(--radius-sm);">
            <h4 style="margin:0 0 0.5rem;">Dụng Thần • Hỷ Thần • Kỵ Thần</h4>
            <div style="margin-bottom:0.5rem;">
              <strong>🌟 Dụng thần (Cần bổ trợ nhất):</strong>
              ${renderElementBadge(useful.dungThan, showHan)}
            </div>
            <div style="margin-bottom:0.5rem;">
              <strong>✨ Hỷ thần (Tương trợ):</strong>
              ${renderElementBadge(useful.hyThan, showHan)}
            </div>
            <div style="margin-bottom:0.5rem;">
              <strong>⚠️ Kỵ thần & Cừu thần (Nên tiết chế):</strong>
              ${renderElementBadge(useful.kyThan, showHan)} ${renderElementBadge(useful.cuuThan, showHan)}
            </div>
            <p style="font-size:0.84rem;color:var(--text-secondary);margin:0.5rem 0 0;">
              ${esc(useful.dieuHau.note)} (${esc(useful.methodNote)})
            </p>
            <div style="margin-top:0.65rem;padding-top:0.5rem;border-top:1px dashed var(--border-color);font-size:0.84rem;">
              <strong>Mệnh quái:</strong> Cung ${esc(menhQuai.primary.trigram.vi)} (${esc(menhQuai.primary.groupVi)}) — Số Quái ${menhQuai.primary.kuaNumber}
            </div>
          </div>
        </div>

        <!-- 10-Year Luck Cycles -->
        <h4 style="margin:0 0 0.45rem;">🌊 Đại Vận 10 Năm (${esc(luck.directionNote)} — Khởi vận lúc ${luck.startAgeYears} tuổi)</h4>
        <div class="hour-timeline" style="margin-bottom:0.5rem;">
          ${luck.cycles
            .map((c) => {
              const isCurrent = currentYear >= c.startYear && currentYear <= c.endYear;
              const ny = getNayinForPillar(c.pillar);
              return `
                <div class="hour-slot ${isCurrent ? 'current' : ''}" style="flex:0 0 122px;cursor:default;">
                  <div style="font-size:0.72rem;color:var(--text-secondary);">${c.startAge}–${c.endAge} tuổi</div>
                  <div style="font-weight:700;font-size:0.9rem;">${formatGanZhi(c.pillar, showHan)}</div>
                  <div style="font-size:0.72rem;">${esc(ny.vi)}</div>
                  <div style="font-size:0.7rem;color:var(--text-muted);">${c.startYear}–${c.endYear}</div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- Section 1: Profiles & Bazi Chart -->
    <section class="card">
      <div class="card-header">
        <h2 class="card-title">👤 Quản lý Hồ sơ Cá nhân (${profiles.length} hồ sơ)</h2>
      </div>

      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;">
        ${profiles
          .map(
            (p) => `
            <div style="display:inline-flex;align-items:center;gap:0.35rem;background:var(--bg-elevated);padding:0.3rem 0.6rem;border-radius:var(--radius-sm);border:1px solid ${p.id === activeProfile?.id ? 'var(--accent-red)' : 'var(--border-color)'};">
              <button type="button" class="btn btn-sm ${p.id === activeProfile?.id ? 'btn-primary' : ''}" data-select-prof="${esc(p.id)}">
                ${esc(p.name)} (${esc(p.birth.datetime.slice(0, 10))})
              </button>
              <button type="button" class="btn btn-sm" data-del-prof="${esc(p.id)}" title="Xóa hồ sơ">✕</button>
            </div>
          `,
          )
          .join('')}
      </div>

      <!-- Create New Profile Form -->
      <details style="background:var(--bg-page);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:0.75rem;">
        <summary style="cursor:pointer;font-weight:700;">➕ Thêm hồ sơ mới (Hỗ trợ nhập Dương lịch hoặc Âm lịch)</summary>
        <div style="display:grid;gap:0.75rem;margin-top:0.85rem;">
          <div class="grid-2">
            <div>
              <label for="np-name">Họ tên / Biệt danh</label>
              <input id="np-name" type="text" placeholder="Ví dụ: Nguyễn Văn A" />
            </div>
            <div>
              <label for="np-gender">Giới tính</label>
              <select id="np-gender">
                <option value="nam">Nam</option>
                <option value="nu">Nữ</option>
                <option value="khong_neu">Không nêu</option>
              </select>
            </div>
          </div>
          <div class="grid-2">
            <div>
              <label for="np-cal">Loại lịch khi nhập ngày sinh</label>
              <select id="np-cal">
                <option value="solar">Dương lịch</option>
                <option value="lunar">Âm lịch Việt Nam (Tự động đổi sang Dương)</option>
              </select>
            </div>
            <div>
              <label for="np-date">Ngày tháng năm sinh (YYYY-MM-DD)</label>
              <input id="np-date" type="date" value="1992-08-20" />
            </div>
          </div>
          <div class="grid-2">
            <div>
              <label for="np-time">Giờ sinh (24h)</label>
              <input id="np-time" type="time" value="09:15" />
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;padding-top:1.4rem;">
              <input id="np-no-hour" type="checkbox" style="width:18px;min-height:18px;" />
              <label for="np-no-hour" style="margin:0;">Không biết giờ sinh (Khuyết trụ giờ)</label>
            </div>
          </div>
          <div>
            <button type="button" class="btn btn-primary" id="btn-create-prof">💾 Lưu hồ sơ mới</button>
          </div>
        </div>
      </details>

      ${baziHtml}
    </section>

    <!-- Section 2: App Settings -->
    <section class="card">
      <h2 class="card-title">⚙️ Cài đặt Hệ thống & Hiển thị</h2>
      <div class="grid-2" style="gap:0.85rem;">
        <div>
          <label for="set-zi">Quy ước đổi ngày ở Giờ Tý (23:00 – 01:00)</label>
          <select id="set-zi">
            <option value="day_changes_at_23" ${settings.ziHourConvention === 'day_changes_at_23' ? 'selected' : ''}>Đổi Can Chi ngày lúc 23:00 (Mặc định)</option>
            <option value="day_changes_at_00" ${settings.ziHourConvention === 'day_changes_at_00' ? 'selected' : ''}>Đổi Can Chi ngày lúc 00:00 (Dạ Tý/Tảo Tý)</option>
          </select>
        </div>
        <div>
          <label for="set-theme">Giao diện Sáng / Tối</label>
          <select id="set-theme">
            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Sáng (Giấy Dó ấm — Mặc định)</option>
            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Tối (Mực huyền dịu mắt)</option>
            <option value="auto" ${settings.theme === 'auto' ? 'selected' : ''}>Tự động theo hệ điều hành</option>
          </select>
        </div>
        <div>
          <label for="set-fontsize">Cỡ chữ hiển thị</label>
          <select id="set-fontsize">
            <option value="normal" ${settings.fontSize === 'normal' ? 'selected' : ''}>Vừa (Chuẩn 16px)</option>
            <option value="large" ${settings.fontSize === 'large' ? 'selected' : ''}>Lớn (18px — Dễ đọc cho người lớn tuổi)</option>
          </select>
        </div>
        <div>
          <label for="set-han">Hiển thị chữ Hán đi kèm thuật ngữ</label>
          <select id="set-han">
            <option value="1" ${settings.showHanChars ? 'selected' : ''}>Bật (Ví dụ: Giáp Tý 甲子)</option>
            <option value="0" ${!settings.showHanChars ? 'selected' : ''}>Tắt (Chỉ hiện tiếng Việt)</option>
          </select>
        </div>
      </div>
    </section>

    <!-- Section 3: Data Backup / Import / Wipe -->
    <section class="card">
      <h2 class="card-title">🗄️ Sao lưu, Khôi phục & Xóa dữ liệu cục bộ</h2>
      <p style="font-size:0.88rem;color:var(--text-secondary);">
        Toàn bộ dữ liệu của bạn nằm trong IndexedDB & localStorage trên trình duyệt này. Bạn có thể xuất ra file JSON để cất giữ hoặc chuyển sang thiết bị khác.
      </p>
      <div style="display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center;">
        <button type="button" class="btn btn-primary" id="btn-export-json">⬇️ Xuất dữ liệu ra file JSON</button>
        <label class="btn" style="margin:0;cursor:pointer;">
          ⬆️ Nhập dữ liệu từ file JSON
          <input type="file" id="input-import-json" accept="application/json" style="display:none;" />
        </label>
        <button type="button" class="btn" id="btn-wipe-all" style="color:var(--status-bad);border-color:var(--status-bad);">
          🗑️ Xóa toàn bộ dữ liệu trên thiết bị
        </button>
      </div>
      <div id="backup-status-msg" style="margin-top:0.55rem;font-size:0.86rem;"></div>
    </section>

    <!-- Section 4: Data Sources & Confidence A/B/C, Privacy, Disclaimer -->
    <section class="card">
      <h2 class="card-title">📚 Về độ tin cậy, Nguồn dữ liệu (Mức A/B/C) & Quyền riêng tư</h2>
      <p style="font-size:0.88rem;color:var(--text-secondary);">
        Mọi bảng tra trong <strong>${APP_NAME}</strong> đều gắn nhãn độ tin cậy minh bạch:
        ${renderConfidenceBadge('A')} (Thiên văn & công thức toán học thống nhất),
        ${renderConfidenceBadge('B')} (Có biến thể nhỏ giữa các sách cổ),
        ${renderConfidenceBadge('C')} (Khác biệt lớn giữa các trường phái, chỉ mang tính tham khảo).
      </p>
      <div style="display:grid;gap:0.45rem;max-height:240px;overflow-y:auto;margin-bottom:0.85rem;">
        ${sourcesData.sources
          .map(
            (src) => `
            <div style="padding:0.5rem 0.75rem;background:var(--bg-page);border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.84rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4rem;">
              <div>
                <strong>${esc(src.title)}</strong> — <span style="color:var(--text-secondary);">${esc(src.usedFor.join(', '))}</span>
              </div>
              ${renderConfidenceBadge(src.confidence)}
            </div>
          `,
          )
          .join('')}
      </div>
      <div style="padding:0.75rem;background:var(--bg-elevated);border-radius:var(--radius-sm);font-size:0.85rem;color:var(--text-secondary);">
        <strong>🔒 Cam kết Quyền riêng tư (100% Offline):</strong> Ứng dụng không có máy chủ backend, không yêu cầu tài khoản, không tích hợp bộ đếm theo dõi và không gửi bất kỳ dữ liệu nào ra khỏi thiết bị của bạn.<br/>
        <strong>⚖️ Miễn trừ trách nhiệm:</strong> Ứng dụng là sản phẩm văn hóa truyền thống và giải trí, không tuyên bố độ chính xác khoa học và tuyệt đối không thay thế lời khuyên y khoa, tài chính hay pháp lý.
      </div>
    </section>
  `;

  // Bind events
  container.querySelectorAll('[data-select-prof]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-select-prof');
      settingsRepo.save({ activeProfileId: id });
      onStateChanged();
    });
  });

  container.querySelectorAll('[data-del-prof]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-del-prof');
      if (!id) return;
      await profileRepo.remove(id);
      const remaining = await profileRepo.getAll();
      if (settings.activeProfileId === id) {
        settingsRepo.save({ activeProfileId: remaining[0]?.id ?? null });
      }
      onStateChanged();
    });
  });

  container.querySelector('#btn-create-prof')?.addEventListener('click', async () => {
    const name = (container.querySelector('#np-name') as HTMLInputElement).value.trim() || 'Hồ sơ mới';
    const gender = (container.querySelector('#np-gender') as HTMLSelectElement).value as Gender;
    const cal = (container.querySelector('#np-cal') as HTMLSelectElement).value as 'solar' | 'lunar';
    let dateStr = (container.querySelector('#np-date') as HTMLInputElement).value || '1992-08-20';
    const timeStr = (container.querySelector('#np-time') as HTMLInputElement).value || '09:15';
    const noHour = (container.querySelector('#np-no-hour') as HTMLInputElement).checked;

    if (cal === 'lunar') {
      const [ly, lm, ld] = dateStr.split('-').map(Number);
      const conv = lunarToSolarVN(ly, lm, ld, false, settings.tzOffsetMinutes);
      if (conv) {
        dateStr = `${conv.year}-${String(conv.month).padStart(2, '0')}-${String(conv.day).padStart(2, '0')}`;
      }
    }

    const now = Date.now();
    const prof: Profile = {
      id: `prof-${now}`,
      name,
      gender,
      birthTimeKnown: !noHour,
      birth: {
        calendar: 'solar',
        datetime: `${dateStr}T${timeStr}`,
        tz: settings.tzOffsetMinutes,
      },
      createdAt: now,
      updatedAt: now,
    };
    await profileRepo.save(prof);
    settingsRepo.save({ activeProfileId: prof.id });
    onStateChanged();
  });

  container.querySelector('#set-zi')?.addEventListener('change', (e) => {
    settingsRepo.save({
      ziHourConvention: (e.target as HTMLSelectElement).value as 'day_changes_at_23' | 'day_changes_at_00',
    });
    onStateChanged();
  });

  container.querySelector('#set-theme')?.addEventListener('change', (e) => {
    settingsRepo.save({
      theme: (e.target as HTMLSelectElement).value as 'light' | 'dark' | 'auto',
    });
    onStateChanged();
  });

  container.querySelector('#set-fontsize')?.addEventListener('change', (e) => {
    settingsRepo.save({
      fontSize: (e.target as HTMLSelectElement).value as 'normal' | 'large',
    });
    onStateChanged();
  });

  container.querySelector('#set-han')?.addEventListener('change', (e) => {
    settingsRepo.save({
      showHanChars: (e.target as HTMLSelectElement).value === '1',
    });
    onStateChanged();
  });

  container.querySelector('#btn-export-json')?.addEventListener('click', async () => {
    const payload = await exportAllData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thien-co-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });

  container.querySelector('#input-import-json')?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await importAllData(parsed);
      const msg = container.querySelector('#backup-status-msg');
      if (msg) {
        msg.innerHTML = `<span style="color:var(--status-good);">✓ Đã khôi phục ${res.profiles.length} hồ sơ, ${res.journals.length} nhật ký, ${res.divinations.length} quẻ!</span>`;
      }
      setTimeout(() => onStateChanged(), 700);
    } catch (err) {
      const msg = container.querySelector('#backup-status-msg');
      if (msg) {
        msg.innerHTML = `<span style="color:var(--status-bad);">Lỗi đọc file JSON: ${esc(err instanceof Error ? err.message : String(err))}</span>`;
      }
    }
  });

  container.querySelector('#btn-wipe-all')?.addEventListener('click', async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ hồ sơ, nhật ký và cài đặt trên thiết bị này không?')) {
      await clearAllData();
      onStateChanged();
    }
  });
}
