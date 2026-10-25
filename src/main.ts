import './ui/styles.css';
import { APP_NAME } from './constants';
import { profileRepo, settingsRepo } from './storage';
import { bindGlobalGlossaryClicks } from './ui/components/glossary-modal';
import { showOnboardingModalIfNeeded } from './ui/components/onboarding';
import { renderTodayScreen, type TodayScreenState } from './ui/screens/today';
import { renderCalendarScreen, type CalendarScreenState } from './ui/screens/calendar';
import { renderDirectionsScreen, type DirectionsScreenState } from './ui/screens/directions';
import { renderToolsScreen, type ToolsScreenState } from './ui/screens/tools';
import { renderProfileSettingsScreen } from './ui/screens/profile-settings';
import { renderFontInspectorScreen } from './ui/screens/font-inspector';
import { registerServiceWorkerUpdatePrompt } from './pwa/register';
import { esc } from './ui/utils';

type RouteId = 'today' | 'calendar' | 'directions' | 'tools' | 'profile' | 'dev_fonts';

const APP_TAGLINE = 'Lịch Can Chi • Tứ Trụ • Dự đoán sự kiện (Offline)';

const nowWall = new Date(Date.now() + 420 * 60_000);
const initialDateStr = `${nowWall.getUTCFullYear()}-${String(nowWall.getUTCMonth() + 1).padStart(2, '0')}-${String(nowWall.getUTCDate()).padStart(2, '0')}`;
const initialHourBranch = Math.floor(((nowWall.getUTCHours() + 1) % 24) / 2);

const todayState: TodayScreenState = {
  dateStr: initialDateStr,
  selectedHourBranch: initialHourBranch,
  compassLayer: 'tong_hop',
  southAtTop: true,
  selectedDir: 'nam',
};

const calendarState: CalendarScreenState = {
  year: nowWall.getUTCFullYear(),
  month: nowWall.getUTCMonth() + 1,
  selectedDay: nowWall.getUTCDate(),
  onlyGoodDays: false,
};

const directionsState: DirectionsScreenState = {
  dateStr: initialDateStr,
  hourBranch: initialHourBranch,
  compassLayer: 'tong_hop',
  southAtTop: true,
  selectedDir: 'nam',
  flyingStarPeriod: 'day',
};

const toolsState: ToolsScreenState = {
  activeSubTab: 'picker',
  purposeId: 'khai_truong',
  rangeDays: 30,
  secondProfileId: '',
  compatProfileAId: '',
  compatProfileBId: '',
  ichingQuestion: '',
  lastCast: null,
  journalDateStr: initialDateStr,
  searchQuery: '',
  encCategory: 'glossary',
};

function parseRouteFromHash(): RouteId {
  const h = window.location.hash || '#/today';
  if (h.startsWith('#/dev/fonts')) return 'dev_fonts';
  if (h.startsWith('#/calendar')) return 'calendar';
  if (h.startsWith('#/directions')) return 'directions';
  if (h.startsWith('#/tools')) return 'tools';
  if (h.startsWith('#/profile')) return 'profile';
  return 'today';
}

function applyThemeAndFontSize(): void {
  const settings = settingsRepo.load();
  const root = document.documentElement;
  let theme = settings.theme;
  if (theme === 'auto') {
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = prefersDark ? 'dark' : 'light';
  }
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-font-size', settings.fontSize);
}

async function renderApp(): Promise<void> {
  applyThemeAndFontSize();

  const root = document.getElementById('app');
  if (!root) return;

  const settings = settingsRepo.load();
  const profiles = await profileRepo.getAll();
  const activeProfile =
    (settings.activeProfileId
      ? profiles.find((p) => p.id === settings.activeProfileId)
      : profiles[0]) ?? null;

  if (activeProfile && settings.activeProfileId !== activeProfile.id) {
    settingsRepo.save({ activeProfileId: activeProfile.id });
  }

  const route = parseRouteFromHash();

  root.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <a href="#/today" class="brand-mark">
          <span class="seal-stamp">天機</span>
          <div>
            <h1 class="brand-title">${esc(APP_NAME)}</h1>
            <span class="brand-subtitle">${esc(APP_TAGLINE)}</span>
          </div>
        </a>
        <div class="profile-QuickSwitch">
          <select id="header-profile-select" aria-label="Chọn hồ sơ cá nhân đang xem" style="width:auto;min-height:38px;padding:0.25rem 0.6rem;font-size:0.84rem;">
            <option value="">-- Lịch chung (Không hồ sơ) --</option>
            ${profiles
              .map(
                (p) =>
                  `<option value="${esc(p.id)}" ${p.id === activeProfile?.id ? 'selected' : ''}>👤 ${esc(p.name)}</option>`,
              )
              .join('')}
          </select>
        </div>
      </header>

      <div class="app-body">
        <nav class="app-nav" aria-label="Điều hướng chính">
          <button type="button" class="nav-btn ${route === 'today' ? 'active' : ''}" data-nav="#/today">
            <span class="nav-icon">☀️</span>
            <span>Hôm nay</span>
          </button>
          <button type="button" class="nav-btn ${route === 'calendar' ? 'active' : ''}" data-nav="#/calendar">
            <span class="nav-icon">📅</span>
            <span>Lịch tháng</span>
          </button>
          <button type="button" class="nav-btn ${route === 'directions' ? 'active' : ''}" data-nav="#/directions">
            <span class="nav-icon">🧭</span>
            <span>Hướng</span>
          </button>
          <button type="button" class="nav-btn ${route === 'tools' ? 'active' : ''}" data-nav="#/tools">
            <span class="nav-icon">🧰</span>
            <span>Công cụ</span>
          </button>
          <button type="button" class="nav-btn ${route === 'profile' ? 'active' : ''}" data-nav="#/profile">
            <span class="nav-icon">👤</span>
            <span>Hồ sơ & Cài đặt</span>
          </button>
        </nav>

        <main class="app-main" id="screen-container"></main>
      </div>
    </div>
  `;

  root.querySelector('#header-profile-select')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value || null;
    settingsRepo.save({ activeProfileId: val });
    renderApp();
  });

  root.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetHash = btn.getAttribute('data-nav');
      if (targetHash) {
        window.location.hash = targetHash;
      }
    });
  });

  const screenContainer = root.querySelector('#screen-container') as HTMLElement;

  if (route === 'today') {
    renderTodayScreen(screenContainer, todayState, activeProfile, settings, (subtab) => {
      toolsState.activeSubTab = subtab as ToolsScreenState['activeSubTab'];
      toolsState.journalDateStr = todayState.dateStr;
      window.location.hash = '#/tools';
    });
  } else if (route === 'calendar') {
    await renderCalendarScreen(screenContainer, calendarState, activeProfile, settings, (dateStr) => {
      todayState.dateStr = dateStr;
      window.location.hash = '#/today';
    });
  } else if (route === 'directions') {
    renderDirectionsScreen(screenContainer, directionsState, activeProfile, settings);
  } else if (route === 'tools') {
    await renderToolsScreen(screenContainer, toolsState, activeProfile, settings, (dateStr) => {
      todayState.dateStr = dateStr;
      window.location.hash = '#/today';
    });
  } else if (route === 'profile') {
    await renderProfileSettingsScreen(screenContainer, activeProfile, settings, () => {
      renderApp();
    });
  } else if (route === 'dev_fonts') {
    renderFontInspectorScreen(screenContainer);
  }
}

bindGlobalGlossaryClicks();
window.addEventListener('hashchange', () => {
  renderApp();
});

renderApp().then(() => {
  showOnboardingModalIfNeeded(() => {
    renderApp();
  });
});

registerServiceWorkerUpdatePrompt();
