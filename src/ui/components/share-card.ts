import { APP_NAME } from '../../constants';
import type { DailyPredictionReport } from '../../core/events/narrator';
import { formatGanZhiPlain } from '../utils';

export async function exportDailyShareCardPng(pred: DailyPredictionReport): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 960;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Do-paper warm background
  ctx.fillStyle = '#f6efe0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Decorative double border
  ctx.strokeStyle = '#b8332a';
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
  ctx.strokeStyle = '#b08328';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

  // Header seal
  ctx.fillStyle = '#b8332a';
  ctx.fillRect(56, 56, 150, 44);
  ctx.fillStyle = '#fbf6eb';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText(APP_NAME.toUpperCase(), 74, 86);

  // Solar & Lunar date
  const al = pred.bundle.almanac;
  ctx.fillStyle = '#1f1d1a';
  ctx.font = 'bold 34px Georgia, serif';
  const dateStr = pred.dateISO;
  ctx.fillText(`Ngày Dương: ${dateStr}`, 56, 150);

  ctx.fillStyle = '#5a5248';
  ctx.font = '22px sans-serif';
  ctx.fillText(
    `Âm lịch: ${al.lunar.day}/${al.lunar.month}${al.lunar.isLeapMonth ? ' (Nhuận)' : ''}/${al.lunar.year} • Ngày ${formatGanZhiPlain(al.dayPillar)}`,
    56,
    190,
  );
  ctx.fillText(
    `Trực ${al.truc.vi} • Sao ${al.tu28.vi} • ${al.dayNayin.vi}`,
    56,
    224,
  );

  // Luck Score Box
  ctx.fillStyle = '#efe5cf';
  ctx.fillRect(56, 255, canvas.width - 112, 110);
  ctx.fillStyle = '#b8332a';
  ctx.font = 'bold 46px Georgia, serif';
  ctx.fillText(`${pred.overallScore}/100`, 80, 325);
  ctx.fillStyle = '#1f1d1a';
  ctx.font = 'bold 28px Georgia, serif';
  ctx.fillText(`Vận ngày: ${pred.ratingLabelVi}`, 260, 305);
  ctx.fillStyle = '#5a5248';
  ctx.font = '18px sans-serif';
  ctx.fillText(
    `Giờ tốt: ${al.topHours
      .slice(0, 4)
      .map((h) => h.branchVi)
      .join(', ')}`,
    260,
    340,
  );

  // Top 4 Events across groups
  ctx.fillStyle = '#1f1d1a';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText('Sự kiện & Lưu ý nổi bật trong ngày:', 56, 410);

  let y = 452;
  const topEvents = [
    ...pred.groups.nguoi,
    ...pred.groups.tien_bac,
    ...pred.groups.cong_viec,
    ...pred.groups.suc_khoe_di_chuyen,
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  for (const ev of topEvents) {
    ctx.fillStyle = '#fbf6eb';
    ctx.fillRect(56, y - 28, canvas.width - 112, 92);
    ctx.strokeStyle = '#d8ccb4';
    ctx.lineWidth = 1;
    ctx.strokeRect(56, y - 28, canvas.width - 112, 92);

    ctx.fillStyle = '#b8332a';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText(`• ${ev.title}`, 74, y);

    ctx.fillStyle = '#3a352f';
    ctx.font = '17px sans-serif';
    const summaryShort =
      ev.situationText.length > 68 ? ev.situationText.slice(0, 65) + '...' : ev.situationText;
    ctx.fillText(summaryShort, 74, y + 32);
    y += 108;
  }

  // Daily Note & Disclaimer footer
  ctx.fillStyle = '#5a5248';
  ctx.font = 'italic 18px Georgia, serif';
  const noteShort =
    pred.dailyNoteText.length > 76
      ? pred.dailyNoteText.slice(0, 73) + '...'
      : pred.dailyNoteText;
  ctx.fillText(`"${noteShort}"`, 56, 875);

  ctx.fillStyle = '#766c5f';
  ctx.font = '14px sans-serif';
  ctx.fillText(
    `${APP_NAME} — Ứng dụng văn hóa Can Chi truyền thống (100% Offline • Chỉ mang tính tham khảo)`,
    56,
    910,
  );

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png'),
  );
  if (!blob) return;

  const fileName = `thien-co-${dateStr}.png`;
  const file = new File([blob], fileName, { type: 'image/png' });

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        title: `${APP_NAME} — Dự đoán ngày ${dateStr}`,
        files: [file],
      });
      return;
    } catch {
      // Fallback to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
