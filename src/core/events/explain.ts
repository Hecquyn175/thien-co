import { ExplainNode } from '../types';
import { ScoredEvent } from './scorer';

/**
 * Dựng cây giải thích "Vì sao?" truy ngược từ Sự kiện → từng Tín hiệu → Quy tắc & Nguồn dữ liệu.
 */
export function buildExplainTree(scored: ScoredEvent): ExplainNode {
  const sortedContribs = [...scored.contributions].sort(
    (a, b) => Math.abs(b.points) - Math.abs(a.points),
  );

  const children: ExplainNode[] = sortedContribs.map((c) => {
    const signPoints =
      scored.direction === 'nghich' ? -Math.abs(c.points) : Math.abs(c.points);
    return {
      ruleId: c.signal.explain.ruleId,
      summary: `${c.signal.explain.summary} [trọng số ${c.weight} × độ mạnh ${c.signal.strength.toFixed(2)} × hệ số khung ${c.slotMultiplier}]`,
      source: c.signal.explain.source,
      confidence: c.signal.explain.confidence,
      contribution: Math.round(signPoints * 100) / 100,
    };
  });

  const dampNote =
    scored.dampenedBy && scored.dampenedBy.length > 0
      ? ` (Đã điều tiết cân bằng với: ${scored.dampenedBy.join(', ')})`
      : '';

  return {
    ruleId: scored.def.id,
    summary: `${scored.def.title} — Điểm tổng hợp: ${scored.score.toFixed(2)} · Độ hội tụ: ${scored.distinctLayerCount} lớp (${scored.convergenceConfidence.toUpperCase()})${dampNote}`,
    source: scored.def.source,
    confidence: scored.def.confidence,
    contribution: scored.score,
    children,
  };
}
