import type { BaguaDir } from '../../core/types';
import { BAGUA_TRIGRAMS, COMPASS_DIRECTIONS_CW } from '../../core/directions/bagua';
import type { MenhQuaiResult } from '../../core/directions/menh-quai';
import type { FlyingStarBoard } from '../../core/directions/flying-stars';
import type { QimenBoard } from '../../core/directions/qimen';
import type { XuatHanhInfo } from '../../core/almanac/xuat-hanh';
import { esc, renderConfidenceBadge } from '../utils';

export type CompassLayer = 'tong_hop' | 'menh_quai' | 'phi_tinh' | 'ky_mon' | 'xuat_hanh';

export interface CompassRenderInput {
  layer: CompassLayer;
  southAtTop: boolean;
  selectedDir: BaguaDir;
  menhQuai?: MenhQuaiResult | null;
  flyingStars: FlyingStarBoard;
  qiMen: QimenBoard;
  xuatHanh: XuatHanhInfo;
  showHan?: boolean;
}

const TRADITIONAL_DIRS_CLOCKWISE: BaguaDir[] = [
  'nam',
  'tay_nam',
  'tay',
  'tay_bac',
  'bac',
  'dong_bac',
  'dong',
  'dong_nam',
];

export function renderCompass(input: CompassRenderInput): string {
  const {
    layer,
    southAtTop,
    selectedDir,
    menhQuai,
    flyingStars,
    qiMen,
    xuatHanh,
    showHan = true,
  } = input;

  const dirs = southAtTop ? TRADITIONAL_DIRS_CLOCKWISE : COMPASS_DIRECTIONS_CW;
  const trigramByDir = new Map(BAGUA_TRIGRAMS.map((t) => [t.direction, t]));

  const cx = 160;
  const cy = 160;
  const outerR = 142;
  const innerR = 46;

  const wedgesSvg: string[] = [];
  dirs.forEach((dir, idx) => {
    const startDeg = idx * 45 - 90 - 22.5;
    const endDeg = startDeg + 45;
    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;
    const midRad = (((startDeg + endDeg) / 2) * Math.PI) / 180;

    const x1 = cx + outerR * Math.cos(startRad);
    const y1 = cy + outerR * Math.sin(startRad);
    const x2 = cx + outerR * Math.cos(endRad);
    const y2 = cy + outerR * Math.sin(endRad);
    const x3 = cx + innerR * Math.cos(endRad);
    const y3 = cy + innerR * Math.sin(endRad);
    const x4 = cx + innerR * Math.cos(startRad);
    const y4 = cy + innerR * Math.sin(startRad);

    const labelR = 96;
    const lx = cx + labelR * Math.cos(midRad);
    const ly = cy + labelR * Math.sin(midRad);

    const tri = trigramByDir.get(dir);
    const mq = menhQuai?.primary.byDirection[dir];
    const fs = flyingStars.byDirection[dir];
    const qm = qiMen.byDirection[dir];

    let subLabel = tri ? `${tri.symbol} ${tri.vi}` : '';
    let isGood = false;
    let isBad = false;

    if (layer === 'menh_quai' && mq) {
      subLabel = mq.starVi;
      isGood = mq.auspicious;
      isBad = !mq.auspicious;
    } else if (layer === 'phi_tinh' && fs) {
      subLabel = `${fs.number} ${fs.shortVi}`;
      isGood = fs.nature === 'cat';
      isBad = fs.nature === 'hung';
    } else if (layer === 'ky_mon' && qm) {
      subLabel = qm.door.vi;
      isGood = qm.door.rating === 'cat';
      isBad = qm.door.rating === 'hung';
    } else if (layer === 'xuat_hanh') {
      const tags: string[] = [];
      if (xuatHanh.hyThan === dir) tags.push('Hỷ');
      if (xuatHanh.taiThan === dir) tags.push('Tài');
      if (xuatHanh.hacThan === dir) tags.push('Hạc!');
      subLabel = tags.length > 0 ? tags.join('/') : 'Bình';
      isGood = tags.includes('Hỷ') || tags.includes('Tài');
      isBad = tags.includes('Hạc!');
    } else {
      // tong_hop
      const goodCount =
        (mq?.auspicious ? 1 : 0) +
        (fs?.nature === 'cat' ? 1 : 0) +
        (qm?.door.rating === 'cat' ? 1 : 0) +
        (xuatHanh.hyThan === dir || xuatHanh.taiThan === dir ? 1 : 0);
      const badCount =
        (mq && !mq.auspicious ? 1 : 0) +
        (fs?.nature === 'hung' ? 1 : 0) +
        (xuatHanh.hacThan === dir ? 1 : 0);
      isGood = goodCount >= 2 && badCount === 0;
      isBad = badCount >= 2;
      subLabel = isGood ? '★ Cát' : isBad ? '⚠ Kỵ' : 'Bình';
    }

    const isSelected = dir === selectedDir;
    const fill = isSelected
      ? 'var(--accent-gold-soft)'
      : isGood
        ? 'var(--status-good-bg)'
        : isBad
          ? 'var(--status-bad-bg)'
          : 'var(--bg-page)';
    const stroke = isSelected ? 'var(--accent-red)' : 'var(--border-strong)';
    const strokeW = isSelected ? 2.5 : 1.2;

    wedgesSvg.push(`
      <g class="compass-sector" data-compass-dir="${dir}" style="cursor:pointer;">
        <path
          d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${outerR} ${outerR} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${innerR} ${innerR} 0 0 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z"
          fill="${fill}"
          stroke="${stroke}"
          stroke-width="${strokeW}"
        />
        <text x="${lx.toFixed(1)}" y="${(ly - 6).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-primary)">
          ${esc(tri?.directionVi ?? dir)}
        </text>
        <text x="${lx.toFixed(1)}" y="${(ly + 10).toFixed(1)}" text-anchor="middle" font-size="10" fill="var(--text-secondary)">
          ${esc(subLabel)}
        </text>
      </g>
    `);
  });

  // Details for selectedDir
  const selTri = trigramByDir.get(selectedDir);
  const selMq = menhQuai?.primary.byDirection[selectedDir];
  const selFs = flyingStars.byDirection[selectedDir];
  const selQm = qiMen.byDirection[selectedDir];
  const isHy = xuatHanh.hyThan === selectedDir;
  const isTai = xuatHanh.taiThan === selectedDir;
  const isHac = xuatHanh.hacThan === selectedDir;

  return `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
        <div class="tab-bar" style="margin-bottom:0;">
          <button type="button" class="tab-btn btn-sm ${layer === 'tong_hop' ? 'active' : ''}" data-compass-layer="tong_hop">Tổng hợp</button>
          <button type="button" class="tab-btn btn-sm ${layer === 'xuat_hanh' ? 'active' : ''}" data-compass-layer="xuat_hanh">Xuất hành</button>
          <button type="button" class="tab-btn btn-sm ${layer === 'menh_quai' ? 'active' : ''}" data-compass-layer="menh_quai">Mệnh quái</button>
          <button type="button" class="tab-btn btn-sm ${layer === 'phi_tinh' ? 'active' : ''}" data-compass-layer="phi_tinh">Phi tinh (${flyingStars.centerStar})</button>
          <button type="button" class="tab-btn btn-sm ${layer === 'ky_mon' ? 'active' : ''}" data-compass-layer="ky_mon">Kỳ Môn (${qiMen.duongDon ? 'Dương' : 'Âm'} ${qiMen.juNumber})</button>
        </div>
        <button type="button" class="btn btn-sm" data-compass-toggle-orient="1">
          🧭 Quy ước: ${southAtTop ? 'Nam trên / Bắc dưới (Cổ truyền)' : 'Bắc trên / Nam dưới (Bản đồ)'}
        </button>
      </div>

      ${
        layer === 'ky_mon'
          ? `<div style="margin-bottom:0.65rem;padding:0.5rem 0.75rem;background:var(--status-warn-bg);border:1px solid var(--status-warn);border-radius:var(--radius-sm);font-size:0.82rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.4rem;">
              <span>⚠️ <strong>${esc(qiMen.methodLabelVi)}:</strong> Tham khảo, nhiều trường phái định cục khác nhau.</span>
              ${renderConfidenceBadge('C')}
            </div>`
          : ''
      }

      <div style="display:flex;flex-wrap:wrap;gap:1.25rem;align-items:center;justify-content:center;">
        <svg viewBox="0 0 320 320" width="290" height="290" role="img" aria-label="La bàn 8 hướng">
          ${wedgesSvg.join('')}
          <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="var(--bg-card)" stroke="var(--accent-red)" stroke-width="2"/>
          <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-family="var(--font-serif)" font-size="13" font-weight="700" fill="var(--accent-red)">
            Trung Cung
          </text>
          <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="11" fill="var(--text-secondary)">
            Sao số ${flyingStars.centerStar}
          </text>
        </svg>

        <div style="flex:1;min-width:250px;background:var(--bg-elevated);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:0.85rem;">
          <h4 style="margin:0 0 0.5rem;">
            Chi tiết hướng: ${esc(selTri?.directionVi ?? selectedDir)}
            ${selTri ? `— Quẻ ${esc(selTri.vi)} ${showHan ? `<span class="cjk">${esc(selTri.symbol)} ${esc(selTri.han)}</span>` : ''}` : ''}
          </h4>
          <ul style="margin:0;padding-left:1.15rem;font-size:0.88rem;">
            <li style="margin-bottom:0.3rem;">
              <strong>Xuất hành (Ngày):</strong>
              ${isHy ? '<span class="badge badge-good">★ Hỷ Thần</span> ' : ''}
              ${isTai ? '<span class="badge badge-good">💰 Tài Thần</span> ' : ''}
              ${isHac ? '<span class="badge badge-bad">⚠ Hạc Thần (Kỵ)</span> ' : ''}
              ${!isHy && !isTai && !isHac ? 'Bình hòa' : ''}
            </li>
            <li style="margin-bottom:0.3rem;">
              <strong>Mệnh quái cá nhân:</strong>
              ${
                selMq
                  ? `<span class="badge ${selMq.auspicious ? 'badge-good' : 'badge-bad'}">${esc(selMq.starVi)}</span> — ${esc(selMq.meaning)}`
                  : '<em>Chưa chọn hồ sơ cá nhân</em>'
              }
            </li>
            <li style="margin-bottom:0.3rem;">
              <strong>Huyền Không Phi Tinh:</strong>
              ${
                selFs
                  ? `<span class="badge ${selFs.nature === 'cat' ? 'badge-good' : 'badge-bad'}">${selFs.number} - ${esc(selFs.vi)}</span> — ${esc(selFs.summary)}`
                  : ''
              }
            </li>
            <li>
              <strong>Kỳ Môn Thời Gia:</strong>
              ${
                selQm
                  ? `Cửa <strong>${esc(selQm.door.vi)}</strong> (${esc(selQm.door.summary)}) • Sao <strong>${esc(selQm.star.vi)}</strong> • Thần <strong>${esc(selQm.deity.vi)}</strong>`
                  : ''
              }
            </li>
          </ul>
        </div>
      </div>
    </div>
  `;
}
