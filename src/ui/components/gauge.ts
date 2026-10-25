import { esc, renderLuckBadge } from '../utils';

export function renderLuckGauge(score: number, label: string, summaryText: string): string {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = 72;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  const strokeColor =
    clamped >= 75
      ? 'var(--status-good)'
      : clamped >= 45
        ? 'var(--accent-gold)'
        : 'var(--status-bad)';

  return `
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:1.25rem;justify-content:center;">
      <div style="position:relative;width:180px;height:105px;text-align:center;">
        <svg viewBox="0 0 180 105" width="180" height="105" role="img" aria-label="Điểm vận ${clamped}/100 - ${esc(label)}">
          <path
            d="M 18 92 A 72 72 0 0 1 162 92"
            fill="none"
            stroke="var(--border-color)"
            stroke-width="14"
            stroke-linecap="round"
          />
          <path
            d="M 18 92 A 72 72 0 0 1 162 92"
            fill="none"
            stroke="${strokeColor}"
            stroke-width="14"
            stroke-linecap="round"
            stroke-dasharray="${circumference.toFixed(1)}"
            stroke-dashoffset="${dashOffset.toFixed(1)}"
          />
          <text x="90" y="72" text-anchor="middle" font-family="var(--font-serif)" font-size="30" font-weight="700" fill="var(--text-primary)">
            ${clamped}
          </text>
          <text x="90" y="92" text-anchor="middle" font-size="11" fill="var(--text-secondary)">
            / 100 điểm vận
          </text>
        </svg>
      </div>
      <div style="flex:1;min-width:220px;">
        <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.45rem;flex-wrap:wrap;">
          <span class="seal-stamp">${esc(label)}</span>
          ${renderLuckBadge(label)}
        </div>
        <p style="margin:0;color:var(--text-primary);font-size:0.95rem;">
          ${esc(summaryText)}
        </p>
      </div>
    </div>
  `;
}
