import type { NarratedEventCard } from '../../core/events/narrator';
import { esc, renderConfidenceBadge } from '../utils';

export function renderEventCard(
  card: NarratedEventCard,
  indexKey: string,
): string {
  const dir = card.direction;
  const dirLabel =
    dir === 'thuan' ? '🟢 Thuận lợi' : dir === 'nghich' ? '🟠 Cần lưu ý' : '⚖️ Trung tính';
  const dirBadgeCls =
    dir === 'thuan' ? 'badge-good' : dir === 'nghich' ? 'badge-bad' : 'badge-warn';

  const dots: string[] = [];
  for (let i = 1; i <= 5; i++) {
    dots.push(`<span class="intensity-dot ${i <= card.intensity ? 'filled' : ''}"></span>`);
  }

  const explainTree = card.explain;
  const explainId = `explain-${esc(indexKey)}`;
  const signalCount = explainTree.children?.length ?? 1;

  return `
    <article class="event-card dir-${esc(dir)}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.4rem;">
        <h4 style="margin:0;font-size:1.03rem;">${esc(card.title)}</h4>
        <div style="display:flex;align-items:center;gap:0.45rem;">
          <span class="badge ${dirBadgeCls}">${dirLabel}</span>
          <span class="intensity-dots" title="Cường độ ${card.intensity}/5 (Điểm hội tụ: ${card.score.toFixed(1)})">
            ${dots.join('')}
          </span>
        </div>
      </div>

      <p style="margin:0.35rem 0;color:var(--text-primary);">
        ${esc(card.situationText)}
      </p>

      <div style="margin-top:0.5rem;padding:0.55rem 0.7rem;background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--border-color);font-size:0.88rem;">
        ${
          card.useAdvice
            ? `<div style="margin-bottom:0.25rem;"><strong>✅ Nên tận dụng:</strong> ${esc(card.useAdvice)}</div>`
            : ''
        }
        ${
          card.avoidAdvice
            ? `<div style="margin-bottom:0.25rem;"><strong>⚠️ Nên tránh:</strong> ${esc(card.avoidAdvice)}</div>`
            : ''
        }
        ${
          card.remedyAdvice
            ? `<div><strong>🌿 Hóa giải / Ứng phó:</strong> ${esc(card.remedyAdvice)}</div>`
            : ''
        }
        ${
          card.safetyNote
            ? `<div style="margin-top:0.35rem;color:var(--text-secondary);font-style:italic;">🩺 ${esc(card.safetyNote)}</div>`
            : ''
        }
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.55rem;flex-wrap:wrap;gap:0.5rem;">
        <span style="font-size:0.8rem;color:var(--text-secondary);">
          🕒 ${esc(card.timeWindowText)}
        </span>
        <button
          type="button"
          class="btn btn-sm toggle-explain-btn"
          data-target="${explainId}"
          aria-expanded="false"
        >
          🔍 Vì sao? (${signalCount} quy tắc)
        </button>
      </div>

      <div id="${explainId}" class="explain-panel" hidden>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.45rem;flex-wrap:wrap;gap:0.4rem;">
          <strong>Truy vết quy tắc: ${esc(explainTree.summary)}</strong>
          ${renderConfidenceBadge(explainTree.confidence ?? 'B')}
        </div>
        <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.5rem;">
          Mã quy tắc: <code>${esc(explainTree.ruleId)}</code> • Điểm hội tụ: <strong>${card.score.toFixed(1)}</strong> • Nguồn: ${esc(explainTree.source)}
        </div>
        <ul style="margin:0;padding-left:1.15rem;">
          ${(explainTree.children ?? [])
            .map(
              (child) => `
              <li style="margin-bottom:0.35rem;">
                <strong>${esc(child.summary)}</strong>
                ${typeof child.contribution === 'number' ? `<span class="badge badge-warn">+${child.contribution.toFixed(2)}</span>` : ''}
                <span style="font-size:0.78rem;color:var(--text-secondary);">(${esc(child.source)} - Mức ${esc(child.confidence)})</span>
                ${
                  child.children && child.children.length > 0
                    ? `<ul style="padding-left:1rem;margin-top:0.2rem;color:var(--text-secondary);">
                        ${child.children
                          .map(
                            (sig) =>
                              `<li><code>${esc(sig.ruleId)}</code>: ${esc(sig.summary)} <em>(${esc(sig.source)})</em></li>`,
                          )
                          .join('')}
                      </ul>`
                    : ''
                }
              </li>
            `,
            )
            .join('')}
        </ul>
      </div>
    </article>
  `;
}
