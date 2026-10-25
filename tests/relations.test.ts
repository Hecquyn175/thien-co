import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { getNayinForPillar, getNayinForSexagenary } from '../src/core/ganzhi/nayin';
import { getHiddenStems } from '../src/core/ganzhi/hidden-stems';
import { sexagenaryToPillar } from '../src/core/ganzhi/pillars';
import {
  elementControlledBy,
  elementControls,
  elementGeneratedBy,
  elementGenerates,
  getElementRelation,
  stemElement,
} from '../src/core/relations/elements';
import {
  checkBranchPairRelations,
  checkStemRelation,
  checkTripleBranchRelations,
  isLucXung,
} from '../src/core/relations/stem-branch-relations';
import { buildTenGodMatrix, getTenGod, TEN_GOD_META } from '../src/core/relations/ten-gods';
import { ElementId, TenGodId } from '../src/core/types';
import relationsData from '../src/data/relations.json';

const require_ = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { LunarUtil } = require_('lunar-javascript') as any;

const ELEMENTS: ElementId[] = ['kim', 'moc', 'thuy', 'hoa', 'tho'];

describe('Nạp âm 60 Hoa Giáp', () => {
  it('phủ đủ 60 Hoa Giáp (30 cặp) và đối chiếu hành với lunar-javascript', () => {
    const EL_MAP: Record<string, ElementId> = {
      金: 'kim',
      木: 'moc',
      水: 'thuy',
      火: 'hoa',
      土: 'tho',
    };
    const seenPairs = new Set<number>();
    for (let i = 0; i < 60; i++) {
      const p = sexagenaryToPillar(i);
      const ny = getNayinForPillar(p);
      expect(ny).toEqual(getNayinForSexagenary(i));
      seenPairs.add(ny.pairIndex);
      // lunar-javascript: LunarUtil.NAYIN['甲子'] = '海中金'
      const gzKey = LunarUtil.JIA_ZI[i];
      const libNayin: string = LunarUtil.NAYIN[gzKey];
      const libLastChar = libNayin.slice(-1);
      expect(ny.element, `${gzKey} -> ${libNayin}`).toBe(EL_MAP[libLastChar]);
    }
    expect(seenPairs.size).toBe(30);
  });
});

describe('Tàng can (Hidden stems)', () => {
  it('12 Chi đều có tàng can, tổng trọng số = 1.0, đối chiếu với lunar-javascript', () => {
    const HAN_TO_IDX: Record<string, number> = {
      甲: 0, 乙: 1, 丙: 2, 丁: 3, 戊: 4, 己: 5, 庚: 6, 辛: 7, 壬: 8, 癸: 9,
    };
    const ZHI_HAN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    for (let b = 0; b < 12; b++) {
      const hs = getHiddenStems(b);
      expect(hs.length).toBeGreaterThanOrEqual(1);
      expect(hs.length).toBeLessThanOrEqual(3);
      const sum = hs.reduce((acc, x) => acc + x.weight, 0);
      expect(sum).toBeCloseTo(1.0, 5);
      const libList: string[] = LunarUtil.ZHI_HIDE_GAN[ZHI_HAN[b]];
      expect(hs.map((x) => x.stem)).toEqual(libList.map((h) => HAN_TO_IDX[h]));
    }
  });
});

describe('Ngũ hành sinh khắc', () => {
  it('chu trình tương sinh và tương khắc khép kín 5 bước', () => {
    for (const e of ELEMENTS) {
      let cur = e;
      for (let i = 0; i < 5; i++) cur = elementGenerates(cur);
      expect(cur).toBe(e);

      cur = e;
      for (let i = 0; i < 5; i++) cur = elementControls(cur);
      expect(cur).toBe(e);

      expect(elementGeneratedBy(elementGenerates(e))).toBe(e);
      expect(elementControlledBy(elementControls(e))).toBe(e);
    }
  });

  it('5x5 tổ hợp trả về đúng 5 loại quan hệ mỗi hàng', () => {
    for (const a of ELEMENTS) {
      const rels = new Set(ELEMENTS.map((b) => getElementRelation(a, b)));
      expect(rels.size).toBe(5);
    }
  });
});

describe('Quan hệ Thiên Can & Địa Chi (đối xứng, phủ kín)', () => {
  it('Ngũ hợp Thiên Can: 5 cặp rời nhau phủ kín 10 Can, đối xứng', () => {
    const covered = new Set<number>();
    for (let a = 0; a < 10; a++) {
      for (let b = 0; b < 10; b++) {
        const ab = checkStemRelation(a, b).filter((r) => r.type === 'ngu_hop');
        const ba = checkStemRelation(b, a).filter((r) => r.type === 'ngu_hop');
        expect(ab.length).toBe(ba.length);
        if (ab.length > 0) {
          covered.add(a);
          covered.add(b);
          expect(Math.abs(a - b)).toBe(5);
        }
      }
    }
    expect(covered.size).toBe(10);
  });

  it('Lục hợp và Lục xung: mỗi loại 6 cặp rời nhau phủ kín 12 Chi và đối xứng', () => {
    const hopCovered = new Set<number>();
    const xungCovered = new Set<number>();
    for (let a = 0; a < 12; a++) {
      for (let b = 0; b < 12; b++) {
        const ab = checkBranchPairRelations(a, b);
        const ba = checkBranchPairRelations(b, a);
        expect(ab.map((x) => x.type).sort()).toEqual(ba.map((x) => x.type).sort());
        if (ab.some((x) => x.type === 'luc_hop')) hopCovered.add(a);
        if (ab.some((x) => x.type === 'luc_xung')) {
          xungCovered.add(a);
          expect(isLucXung(a, b)).toBe(true);
        }
      }
    }
    expect(hopCovered.size).toBe(12);
    expect(xungCovered.size).toBe(12);
  });

  it('Lục hại và Lục phá đối xứng và phủ kín 12 Chi', () => {
    const haiSet = new Set<number>();
    const phaSet = new Set<number>();
    for (let a = 0; a < 12; a++) {
      for (let b = 0; b < 12; b++) {
        const ab = checkBranchPairRelations(a, b);
        if (ab.some((x) => x.type === 'hai')) haiSet.add(a);
        if (ab.some((x) => x.type === 'pha')) phaSet.add(a);
      }
    }
    expect(haiSet.size).toBe(12);
    expect(phaSet.size).toBe(12);
  });

  it('Tam hợp và Tam hội: mỗi loại 4 bộ x 3 Chi phủ kín 12 Chi', () => {
    const all12 = Array.from({ length: 12 }, (_, i) => i);
    const triples = checkTripleBranchRelations(all12);
    const tamHop = triples.filter((t) => t.type === 'tam_hop');
    const tamHoi = triples.filter((t) => t.type === 'tam_hoi');
    expect(tamHop.length).toBe(4);
    expect(tamHoi.length).toBe(4);
    expect(new Set(tamHop.flatMap((t) => t.branches)).size).toBe(12);
    expect(new Set(tamHoi.flatMap((t) => t.branches)).size).toBe(12);
  });

  it('Tương hình phủ kín 12 Chi (vô ân 3 + ỷ thế 3 + vô lễ 2 + tự hình 4)', () => {
    const all = new Set<number>();
    for (const tr of relationsData.hinh.triples) tr.set.forEach((b) => all.add(b));
    for (const p of relationsData.hinh.pairs) p.pair.forEach((b) => all.add(b));
    for (const s of relationsData.hinh.self) {
      all.add(s);
      const selfHit = checkBranchPairRelations(s, s);
      expect(selfHit.some((h) => h.type === 'hinh' && h.hinhSubtype === 'tu_hinh')).toBe(true);
    }
    expect(all.size).toBe(12);
  });
});

describe('Thập thần (10x10 = 100 tổ hợp)', () => {
  it('phủ đủ 100 tổ hợp, mỗi hàng và mỗi cột là hoán vị của 10 Thập thần', () => {
    const matrix = buildTenGodMatrix();
    expect(matrix.length).toBe(10);
    const allIds = Object.keys(TEN_GOD_META) as TenGodId[];
    let count = 0;

    for (let dm = 0; dm < 10; dm++) {
      expect(matrix[dm].length).toBe(10);
      expect(new Set(matrix[dm]).size).toBe(10);
      // Chính mình luôn là Tỷ Kiên
      expect(matrix[dm][dm]).toBe('ty_kien');
      for (let t = 0; t < 10; t++) {
        expect(allIds).toContain(matrix[dm][t]);
        count++;
      }
    }
    expect(count).toBe(100);

    // Kiểm cột
    for (let col = 0; col < 10; col++) {
      const colSet = new Set(matrix.map((row) => row[col]));
      expect(colSet.size).toBe(10);
    }
  });

  it('kiểm chứng toàn bộ 100 ô theo định nghĩa Giáp (0) và tổng quát', () => {
    // Với Giáp (0, Dương Mộc):
    // 0 Giáp = ty_kien, 1 Ất = kiep_tai, 2 Bính = thuc_than, 3 Đinh = thuong_quan,
    // 4 Mậu = thien_tai, 5 Kỷ = chinh_tai, 6 Canh = that_sat, 7 Tân = chinh_quan,
    // 8 Nhâm = thien_an, 9 Quý = chinh_an
    const expectedForGiap: TenGodId[] = [
      'ty_kien',
      'kiep_tai',
      'thuc_than',
      'thuong_quan',
      'thien_tai',
      'chinh_tai',
      'that_sat',
      'chinh_quan',
      'thien_an',
      'chinh_an',
    ];
    for (let t = 0; t < 10; t++) {
      expect(getTenGod(0, t)).toBe(expectedForGiap[t]);
    }
    // Với Ất (1, Âm Mộc): đảo cùng/khác âm dương trong từng cặp
    const expectedForAt: TenGodId[] = [
      'kiep_tai',
      'ty_kien',
      'thuong_quan',
      'thuc_than',
      'chinh_tai',
      'thien_tai',
      'chinh_quan',
      'that_sat',
      'chinh_an',
      'thien_an',
    ];
    for (let t = 0; t < 10; t++) {
      expect(getTenGod(1, t)).toBe(expectedForAt[t]);
    }
    // Bất biến dịch vòng theo hành (dịch +2 Can cho cả Nhật chủ và target thì Thập thần giữ nguyên)
    for (let dm = 0; dm < 10; dm++) {
      for (let t = 0; t < 10; t++) {
        expect(getTenGod((dm + 2) % 10, (t + 2) % 10)).toBe(getTenGod(dm, t));
        expect(stemElement(dm)).toBeDefined();
      }
    }
  });
});
