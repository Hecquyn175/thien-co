import glossaryData from '../../data/glossary.json';
import { esc } from '../utils';

const termById = new Map(glossaryData.terms.map((t) => [t.id, t]));
const termByName = new Map(
  glossaryData.terms.map((t) => [t.term.toLowerCase(), t]),
);

export function openGlossaryModal(termKey: string): void {
  const entry =
    termById.get(termKey) ??
    termByName.get(termKey.toLowerCase()) ??
    glossaryData.terms.find((t) => t.term.toLowerCase().includes(termKey.toLowerCase()));

  const existing = document.getElementById('glossary-modal-backdrop');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'glossary-modal-backdrop';
  backdrop.className = 'modal-backdrop';

  if (!entry) {
    backdrop.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true">
        <div class="card-header">
          <h3 class="card-title">Giải thích thuật ngữ</h3>
          <button type="button" class="btn btn-sm" id="close-glossary-btn">Đóng</button>
        </div>
        <p>Chưa tìm thấy mục từ cho <strong>${esc(termKey)}</strong>.</p>
      </div>
    `;
  } else {
    backdrop.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true">
        <div class="card-header">
          <h3 class="card-title">
            ${esc(entry.term)}
            ${entry.han ? `<span class="cjk" style="color:var(--accent-red);">(${esc(entry.han)})</span>` : ''}
          </h3>
          <button type="button" class="btn btn-sm" id="close-glossary-btn">Đóng</button>
        </div>
        <div style="margin-bottom:0.65rem;">
          <span class="badge badge-warn">Nhóm: ${esc(entry.category)}</span>
        </div>
        <p style="margin:0.5rem 0;">${esc(entry.short)}</p>
      </div>
    `;
  }

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || (e.target as HTMLElement).id === 'close-glossary-btn') {
      backdrop.remove();
    }
  });
  document.body.appendChild(backdrop);
}

export function bindGlobalGlossaryClicks(): void {
  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement | null)?.closest?.('[data-term]') as HTMLElement | null;
    if (target) {
      const term = target.getAttribute('data-term');
      if (term) {
        e.preventDefault();
        openGlossaryModal(term);
      }
    }
  });
}
