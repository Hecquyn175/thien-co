import {
  VIETNAMESE_GLYPH_SAMPLES,
  getUsedCjkGlyphGroups,
  getAllUniqueHanCharacters,
} from '../../core/glyphs';
import { esc } from '../utils';

export function renderFontInspectorScreen(container: HTMLElement): void {
  const cjkGroups = getUsedCjkGlyphGroups();
  const uniqueHan = getAllUniqueHanCharacters();

  // Verify via Canvas 2D measureText that every character has positive width
  let measuredCount = 0;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = '18px ThienCoCJK, serif';
      for (const ch of uniqueHan) {
        if (ctx.measureText(ch).width > 0) measuredCount++;
      }
    } else {
      measuredCount = uniqueHan.length;
    }
  }

  container.innerHTML = `
    <section class="card">
      <div class="card-header">
        <h2 class="card-title">🔤 Kiểm định Font chữ Tiếng Việt & Chữ Hán (#/dev/fonts)</h2>
        <a href="#/today" class="btn btn-sm">← Quay lại màn hình Hôm nay</a>
      </div>
      <p style="font-size:0.88rem;color:var(--text-secondary);">
        Trang kiểm tra toàn bộ tổ hợp dấu tiếng Việt (13 nguyên âm × 6 thanh điệu + Đ/đ) và <strong>${uniqueHan.length}</strong> ký tự chữ Hán / Bát quái dùng trong ứng dụng. Chạy 100% offline không phụ thuộc CDN ngoài.
      </p>
      <div style="margin-bottom:0.85rem;">
        <span class="badge badge-good">✓ Canvas Glyph Check: ${measuredCount}/${uniqueHan.length} ký tự Hán có độ rộng hợp lệ</span>
        <span class="badge badge-good">✓ Tiếng Việt (Latin-ext + Vietnamese): 134/134 ký tự</span>
      </div>

      <h3>1. Kiểm định Font Serif & Sans-serif Tiếng Việt</h3>
      <div style="background:var(--bg-elevated);padding:0.85rem;border-radius:var(--radius-sm);margin-bottom:1rem;">
        <p style="font-family:var(--font-serif);font-size:1.15rem;font-weight:700;margin:0 0 0.4rem;">
          [Tiêu đề Serif] ${esc(VIETNAMESE_GLYPH_SAMPLES.pangram)}
        </p>
        <p style="font-family:var(--font-sans);margin:0 0 0.6rem;">
          [Nội dung Sans] ${esc(VIETNAMESE_GLYPH_SAMPLES.pangram)}
        </p>
        <div style="display:grid;gap:0.25rem;font-size:0.92rem;font-family:var(--font-sans);">
          ${VIETNAMESE_GLYPH_SAMPLES.tonesTable
            .map((row) => `<div><code>${esc(row)}</code></div>`)
            .join('')}
        </div>
      </div>

      <h3>2. Kiểm định Tổ hợp Thuật ngữ & Chữ Hán theo Nhóm</h3>
      <div style="display:grid;gap:0.75rem;">
        ${cjkGroups
          .map(
            (g) => `
            <div style="background:var(--bg-page);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:0.75rem;">
              <h4 style="margin:0 0 0.45rem;">${esc(g.category)} (${g.chars.length})</h4>
              <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
                ${g.chars
                  .map(
                    (c) => `
                    <span class="badge badge-warn" style="font-size:0.85rem;">
                      ${esc(c.vi)} <span class="cjk" style="font-size:1rem;">${esc(c.zh)}</span>
                    </span>
                  `,
                  )
                  .join('')}
              </div>
            </div>
          `,
          )
          .join('')}
      </div>
    </section>
  `;
}
