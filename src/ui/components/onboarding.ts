import { APP_NAME } from '../../constants';
import type { Profile } from '../../core/bazi/chart';
import type { Gender } from '../../core/directions/menh-quai';
import { profileRepo, settingsRepo } from '../../storage';

export function showOnboardingModalIfNeeded(onComplete: () => void): void {
  const settings = settingsRepo.load();
  if (settings.onboardingCompleted) return;

  let step = 1;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'onboarding-modal';

  function renderStep(): void {
    if (step === 1) {
      backdrop.innerHTML = `
        <div class="modal-box" role="dialog" aria-modal="true">
          <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.75rem;">
            <span class="seal-stamp">天機</span>
            <h2 style="margin:0;">Chào mừng đến với ${APP_NAME}</h2>
          </div>
          <p>
            <strong>${APP_NAME}</strong> là ứng dụng tra cứu lịch Can Chi, Tứ Trụ (Bát Tự), Lịch Vạn Niên Việt Nam, Phương hướng và Kinh Dịch chạy <strong>100% offline</strong> ngay trên thiết bị của bạn.
          </p>
          <div style="background:var(--bg-elevated);padding:0.85rem;border-radius:var(--radius-sm);border-left:4px solid var(--accent-red);font-size:0.88rem;margin:0.85rem 0;">
            <strong>📌 Lưu ý quan trọng & Miễn trừ trách nhiệm:</strong>
            <ul style="margin:0.4rem 0 0;padding-left:1.2rem;">
              <li>Mọi nội dung dự đoán chỉ mang tính <strong>tham khảo văn hóa truyền thống, chiêm nghiệm và giải trí</strong>, không có giá trị thay thế tư vấn y tế, tài chính hay pháp lý.</li>
              <li>Toàn bộ dữ liệu (ngày sinh, nhật ký) chỉ lưu cục bộ trên máy bạn, không gửi đi bất kỳ đâu.</li>
            </ul>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:1rem;">
            <button type="button" class="btn btn-primary" id="ob-next-1">Tiếp tục (Bước 1/3) →</button>
          </div>
        </div>
      `;
      backdrop.querySelector('#ob-next-1')?.addEventListener('click', () => {
        step = 2;
        renderStep();
      });
    } else if (step === 2) {
      backdrop.innerHTML = `
        <div class="modal-box" role="dialog" aria-modal="true">
          <h3 style="margin-top:0;">Bước 2/3: Tạo hồ sơ cá nhân (Tùy chọn)</h3>
          <p style="font-size:0.88rem;color:var(--text-secondary);">
            Nhập ngày giờ sinh để nhận dự đoán cá nhân hóa theo Tứ Trụ & Dụng Thần. Bạn cũng có thể <strong>Bỏ qua</strong> để xem lịch chung trước.
          </p>
          <div style="display:grid;gap:0.75rem;margin:0.85rem 0;">
            <div>
              <label for="ob-name">Tên gọi / Biệt danh</label>
              <input id="ob-name" type="text" placeholder="Ví dụ: Minh An" value="Bạn đọc" />
            </div>
            <div class="grid-2">
              <div>
                <label for="ob-date">Ngày sinh Dương lịch</label>
                <input id="ob-date" type="date" value="1995-06-15" />
              </div>
              <div>
                <label for="ob-time">Giờ sinh (24h)</label>
                <input id="ob-time" type="time" value="08:30" />
              </div>
            </div>
            <div class="grid-2">
              <div>
                <label for="ob-gender">Giới tính (tính Đại vận & Mệnh quái)</label>
                <select id="ob-gender">
                  <option value="nam">Nam</option>
                  <option value="nu">Nữ</option>
                  <option value="khong_neu">Không nêu</option>
                </select>
              </div>
              <div style="display:flex;align-items:center;gap:0.5rem;padding-top:1.4rem;">
                <input id="ob-no-hour" type="checkbox" style="width:20px;min-height:20px;" />
                <label for="ob-no-hour" style="margin:0;">Chưa rõ giờ sinh</label>
              </div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;gap:0.5rem;margin-top:1rem;flex-wrap:wrap;">
            <button type="button" class="btn" id="ob-skip-2">Bỏ qua, xem lịch chung</button>
            <button type="button" class="btn btn-primary" id="ob-save-2">Lưu hồ sơ & Tiếp tục →</button>
          </div>
        </div>
      `;
      backdrop.querySelector('#ob-skip-2')?.addEventListener('click', () => {
        step = 3;
        renderStep();
      });
      backdrop.querySelector('#ob-save-2')?.addEventListener('click', async () => {
        const name = (backdrop.querySelector('#ob-name') as HTMLInputElement).value.trim() || 'Bạn đọc';
        const dateVal = (backdrop.querySelector('#ob-date') as HTMLInputElement).value || '1995-06-15';
        const timeVal = (backdrop.querySelector('#ob-time') as HTMLInputElement).value || '08:30';
        const gender = (backdrop.querySelector('#ob-gender') as HTMLSelectElement).value as Gender;
        const noHour = (backdrop.querySelector('#ob-no-hour') as HTMLInputElement).checked;

        const now = Date.now();
        const profile: Profile = {
          id: `prof-${now}`,
          name,
          gender,
          birthTimeKnown: !noHour,
          birth: {
            calendar: 'solar',
            datetime: `${dateVal}T${timeVal}`,
            tz: 420,
          },
          createdAt: now,
          updatedAt: now,
        };
        await profileRepo.save(profile);
        settingsRepo.save({ activeProfileId: profile.id });
        step = 3;
        renderStep();
      });
    } else {
      backdrop.innerHTML = `
        <div class="modal-box" role="dialog" aria-modal="true">
          <h3 style="margin-top:0;">Bước 3/3: Quy ước Giờ Tý (23:00 – 01:00)</h3>
          <p style="font-size:0.88rem;color:var(--text-secondary);">
            Trong mệnh lý học truyền thống, có hai quy ước tính Can Chi ngày khi bước vào giờ Tý (23:00 đêm):
          </p>
          <div style="display:grid;gap:0.65rem;margin:0.85rem 0;">
            <label style="display:flex;align-items:flex-start;gap:0.6rem;padding:0.75rem;border:1px solid var(--border-strong);border-radius:var(--radius-sm);cursor:pointer;background:var(--bg-elevated);">
              <input type="radio" name="ob-zi" value="day_changes_at_23" checked style="width:20px;min-height:20px;margin-top:2px;" />
              <span>
                <strong>Đổi ngày lúc 23:00 (Mặc định truyền thống)</strong><br/>
                <small style="color:var(--text-secondary);">Từ 23:00 đêm đã bước sang Can Chi của ngày hôm sau.</small>
              </span>
            </label>
            <label style="display:flex;align-items:flex-start;gap:0.6rem;padding:0.75rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);cursor:pointer;background:var(--bg-page);">
              <input type="radio" name="ob-zi" value="day_changes_at_00" style="width:20px;min-height:20px;margin-top:2px;" />
              <span>
                <strong>Đổi ngày lúc 00:00 (Dạ Tý / Tảo Tý)</strong><br/>
                <small style="color:var(--text-secondary);">Giữ nguyên ngày cũ đến hết 23:59, qua 00:00 mới đổi ngày.</small>
              </span>
            </label>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:1rem;">
            <button type="button" class="btn btn-primary" id="ob-finish">Hoàn tất & Khám phá ${APP_NAME} ✨</button>
          </div>
        </div>
      `;
      backdrop.querySelector('#ob-finish')?.addEventListener('click', () => {
        const checked = backdrop.querySelector('input[name="ob-zi"]:checked') as HTMLInputElement | null;
        const zi = (checked?.value as 'day_changes_at_23' | 'day_changes_at_00') || 'day_changes_at_23';
        settingsRepo.save({
          ziHourConvention: zi,
          onboardingCompleted: true,
        });
        backdrop.remove();
        onComplete();
      });
    }
  }

  renderStep();
  document.body.appendChild(backdrop);
}
