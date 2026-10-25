import ganzhiData from '../data/ganzhi.json';
import nayinData from '../data/nayin.json';
import trucData from '../data/truc.json';
import tu28Data from '../data/tu28.json';
import hoangDaoData from '../data/hoang-dao.json';
import baguaData from '../data/bagua.json';
import flyingStarsData from '../data/flying-stars.json';
import qimenData from '../data/qimen.json';
import hexagramsData from '../data/hexagrams.json';

/**
 * Full Vietnamese diacritic test pangrams and vowel table (6 tones x 12 vowels + Đ/đ).
 */
export const VIETNAMESE_GLYPH_SAMPLES = {
  pangram:
    'Do bạch kim rất quý nên sẽ dùng để lắp vô xương hoặc giữ nguyên chữ nghĩa tiếng Việt chuẩn xác.',
  tonesTable: [
    'A Á À Ả Ã Ạ a á à ả ã ạ',
    'Ă Ắ Ằ Ẳ Ẵ Ặ ă ắ ằ ẳ ẵ ặ',
    'Â Ấ Ầ Ẩ Ẫ Ậ â ấ ầ ẩ ẫ ậ',
    'E É È Ẻ Ẽ Ẹ e é è ẻ ẽ ẹ',
    'Ê Ế Ề Ể Ễ Ệ ê ế ề ể ễ ệ',
    'I Í Ì Ỉ Ĩ Ị i í ì ỉ ĩ ị',
    'O Ó Ò Ỏ Õ Ọ o ó ò ỏ õ ọ',
    'Ô Ố Ồ Ổ Ỗ Ộ ô ố ồ ổ ỗ ộ',
    'Ơ Ớ Ờ Ở Ỡ Ợ ơ ớ ờ ở ỡ ợ',
    'U Ú Ù Ủ Ũ Ụ u ú ù ủ ũ ụ',
    'Ư Ứ Ừ Ử Ữ Ự ư ứ ừ ử ữ ự',
    'Y Ý Ỳ Ỷ Ỹ Ỵ y ý ỳ ỷ ỹ ỵ',
    'Đ đ',
  ],
  combinations: [
    'Thuận / Nghịch / Bình hòa / Đại cát / Đại hung',
    'Quý nhân tương trợ — Dễ gặp người nâng đỡ, tháo gỡ vướng mắc',
    'Thương quan kiến Quan — Cẩn trọng lời ăn tiếng nói, giấy tờ hợp đồng',
    'Kỳ Môn Độn Giáp • Huyền Không Phi Tinh • Nhị Thập Bát Tú • Thập Nhị Kiến Trừ',
  ],
};

export interface CjkGlyphGroup {
  category: string;
  chars: Array<{ zh: string; vi: string }>;
}

/**
 * Collects all CJK / Han characters and trigram/hexagram symbols used across the app datasets.
 */
export function getUsedCjkGlyphGroups(): CjkGlyphGroup[] {
  return [
    {
      category: '10 Thiên Can',
      chars: ganzhiData.stems.map((s) => ({ zh: s.han, vi: s.vi })),
    },
    {
      category: '12 Địa Chi',
      chars: ganzhiData.branches.map((b) => ({ zh: b.han, vi: b.vi })),
    },
    {
      category: 'Ngũ Hành & Âm Dương',
      chars: [
        { zh: '木', vi: 'Mộc' },
        { zh: '火', vi: 'Hỏa' },
        { zh: '土', vi: 'Thổ' },
        { zh: '金', vi: 'Kim' },
        { zh: '水', vi: 'Thủy' },
        { zh: '陰', vi: 'Âm' },
        { zh: '陽', vi: 'Dương' },
      ],
    },
    {
      category: '12 Trực (Kiến Trừ)',
      chars: trucData.items.map((t) => ({ zh: t.han, vi: t.vi })),
    },
    {
      category: '28 Sao (Nhị Thập Bát Tú)',
      chars: tu28Data.items.map((s) => ({ zh: s.han, vi: s.vi })),
    },
    {
      category: '12 Thần Hoàng Đạo / Hắc Đạo',
      chars: hoangDaoData.deities.map((s) => ({ zh: s.han, vi: s.vi })),
    },
    {
      category: 'Bát Quái (8 Quẻ Đơn)',
      chars: baguaData.trigrams.map((t) => ({ zh: `${t.symbol} ${t.han}`, vi: t.vi })),
    },
    {
      category: 'Cửu Tinh (9 Sao Phi Tinh)',
      chars: flyingStarsData.stars.map((s) => ({ zh: s.han, vi: s.vi })),
    },
    {
      category: 'Kỳ Môn (Bát Môn, Cửu Tinh, Bát Thần)',
      chars: [
        ...qimenData.doors.map((d) => ({ zh: d.han, vi: d.vi })),
        ...qimenData.stars.map((s) => ({ zh: s.han, vi: s.vi })),
        ...qimenData.deities.map((d) => ({ zh: d.han, vi: d.vi })),
      ],
    },
    {
      category: '30 Nạp Âm (60 Hoa Giáp)',
      chars: nayinData.pairs.slice(0, 12).map((e) => ({ zh: e.han, vi: e.vi })),
    },
    {
      category: '64 Quẻ Kinh Dịch',
      chars: hexagramsData.hexagrams.map((h) => ({ zh: h.han, vi: h.vi })),
    },
  ];
}

/**
 * Extracts a deduplicated sorted array of every single Han/CJK character used across datasets.
 */
export function getAllUniqueHanCharacters(): string[] {
  const set = new Set<string>();
  const groups = getUsedCjkGlyphGroups();
  for (const g of groups) {
    for (const item of g.chars) {
      for (const ch of item.zh) {
        const code = ch.codePointAt(0) ?? 0;
        if (code >= 0x2630) {
          set.add(ch);
        }
      }
    }
  }
  for (const entry of nayinData.pairs) {
    for (const ch of entry.han) {
      const code = ch.codePointAt(0) ?? 0;
      if (code >= 0x2630) set.add(ch);
    }
  }
  return Array.from(set).sort();
}
