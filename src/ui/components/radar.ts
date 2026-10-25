import type { ElementId } from '../../core/types';
import { renderElementBadge } from '../utils';

const ELEMENTS_ORDER: Array<{ el: ElementId; label: string }> = [
  { el: 'moc', label: 'Mộc' },
  { el: 'hoa', label: 'Hỏa' },
  { el: 'tho', label: 'Thổ' },
  { el: 'kim', label: 'Kim' },
  { el: 'thuy', label: 'Thủy' },
];

export function renderFiveElementRadar(
  scores: Record<ElementId, number>,
  showHan = true,
): string {
  const total =
    Object.values(scores).reduce((acc, v) => acc + v, 0) || 1;
  const pcts: Record<ElementId, number> = {
    moc: Math.round((scores.moc / total) * 100),
    hoa: Math.round((scores.hoa / total) * 100),
    tho: Math.round((scores.tho / total) * 100),
    kim: Math.round((scores.kim / total) * 100),
    thuy: Math.round((scores.thuy / total) * 100),
  };

  const cx = 120;
  const cy = 120;
  const maxR = 82;

  const axisLines: string[] = [];
  const dataPoints: string[] = [];
  const labelsSvg: string[] = [];

  ELEMENTS_ORDER.forEach((item, idx) => {
    const angle = ((idx * 72 - 90) * Math.PI) / 180;
    const ax = cx + maxR * Math.cos(angle);
    const ay = cy + maxR * Math.sin(angle);
    axisLines.push(
      `<line x1="${cx}" y1="${cy}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" stroke="var(--border-strong)" stroke-width="1"/>`,
    );

    const norm = Math.min(1, Math.max(0.12, (pcts[item.el] || 0) / 45));
    const px = cx + maxR * norm * Math.cos(angle);
    const py = cy + maxR * norm * Math.sin(angle);
    dataPoints.push(`${px.toFixed(1)},${py.toFixed(1)}`);

    const lx = cx + (maxR + 22) * Math.cos(angle);
    const ly = cy + (maxR + 22) * Math.sin(angle);
    labelsSvg.push(
      `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-primary)">${item.label} (${pcts[item.el]}%)</text>`,
    );
  });

  return `
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:1rem;justify-content:center;">
      <svg viewBox="0 0 240 240" width="230" height="230" role="img" aria-label="Biểu đồ tỷ lệ Ngũ hành trong lá số">
        <circle cx="${cx}" cy="${cy}" r="${maxR}" fill="none" stroke="var(--border-color)" stroke-dasharray="4 3"/>
        <circle cx="${cx}" cy="${cy}" r="${(maxR * 0.5).toFixed(1)}" fill="none" stroke="var(--border-color)" stroke-dasharray="3 3"/>
        ${axisLines.join('')}
        <polygon points="${dataPoints.join(' ')}" fill="var(--accent-red-soft)" stroke="var(--accent-red)" stroke-width="2.2"/>
        ${labelsSvg.join('')}
      </svg>
      <div style="flex:1;min-width:210px;">
        ${ELEMENTS_ORDER.map(
          (item) => `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem;">
              ${renderElementBadge(item.el, showHan)}
              <div style="flex:1;margin:0 0.6rem;height:8px;background:var(--bg-elevated);border-radius:4px;overflow:hidden;">
                <div style="width:${Math.min(100, pcts[item.el])}%;height:100%;background:var(--accent-red);"></div>
              </div>
              <strong style="font-size:0.85rem;min-width:38px;text-align:right;">${pcts[item.el]}%</strong>
            </div>
          `,
        ).join('')}
      </div>
    </div>
  `;
}
