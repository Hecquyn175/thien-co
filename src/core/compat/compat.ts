import ganzhiData from '../../data/ganzhi.json';
import { computeDayAlmanac } from '../almanac/gio-dep';
import { BaziChart } from '../bazi/chart';
import { elementVi, getElementRelation, stemElement } from '../relations/elements';
import { checkBranchPairRelations, checkStemRelation } from '../relations/stem-branch-relations';
import { ElementId } from '../types';

export interface CompatDimensionScore {
  score: number; // 0..100
  labelVi: string;
  points: string[];
}

export interface CompatibilityReport {
  overallScore: number; // 0..100
  summaryLabelVi: string;
  domains: {
    tinhCam: CompatDimensionScore;
    lamAn: CompatDimensionScore;
    songChung: CompatDimensionScore;
  };
  details: {
    dayMasterRelation: string;
    dayBranchRelation: string;
    yearBranchRelation: string;
    nayinRelation: string;
    elementComplement: string;
    usefulGodSynergy: string;
    menhQuaiRelation: string;
  };
  todayTogetherSuggestions: string[];
}

export function evaluateCompatibility(
  chartA: BaziChart,
  chartB: BaziChart,
  todayInstant: number,
  tzOffsetMinutes: number,
): CompatibilityReport {
  let tinhCamScore = 62;
  let lamAnScore = 62;
  let songChungScore = 62;

  const tinhCamPoints: string[] = [];
  const lamAnPoints: string[] = [];
  const songChungPoints: string[] = [];

  // 1) Quan hệ Nhật chủ (Can ngày)
  const dmA = chartA.dayMasterStem;
  const dmB = chartB.dayMasterStem;
  const dmStemRels = checkStemRelation(dmA, dmB);
  const dmElRel = getElementRelation(stemElement(dmA), stemElement(dmB));
  let dayMasterRelation: string;

  if (dmStemRels.some((r) => r.type === 'ngu_hop')) {
    tinhCamScore += 16;
    songChungScore += 12;
    dayMasterRelation = `Nhật chủ ${ganzhiData.stems[dmA].vi} và ${ganzhiData.stems[dmB].vi} Ngũ hợp: dễ đồng cảm và thu hút tự nhiên.`;
    tinhCamPoints.push(dayMasterRelation);
  } else if (dmElRel === 'ta_sinh' || dmElRel === 'sinh_ta') {
    tinhCamScore += 10;
    lamAnScore += 8;
    dayMasterRelation = `Nhật chủ tương sinh (${elementVi(stemElement(dmA))} – ${elementVi(stemElement(dmB))}): dễ nâng đỡ và nhường nhịn nhau.`;
    tinhCamPoints.push(dayMasterRelation);
  } else if (dmElRel === 'ty_hoa') {
    lamAnScore += 8;
    dayMasterRelation = `Nhật chủ đồng hành (${elementVi(stemElement(dmA))}): dễ hiểu suy nghĩ của nhau như bạn đồng hành.`;
    lamAnPoints.push(dayMasterRelation);
  } else {
    tinhCamScore -= 6;
    dayMasterRelation = `Nhật chủ tương khắc nhẹ: góc nhìn khác nhau giúp phản biện tốt nếu biết tôn trọng khoảng riêng.`;
    lamAnPoints.push(dayMasterRelation);
  }

  // 2) Quan hệ Nhật chi (Cung phối ngẫu)
  const dbA = chartA.day.pillar.branch;
  const dbB = chartB.day.pillar.branch;
  const dbRels = checkBranchPairRelations(dbA, dbB);
  let dayBranchRelation: string;

  if (dbRels.some((r) => r.type === 'luc_hop' || r.type === 'ban_tam_hop')) {
    tinhCamScore += 15;
    songChungScore += 15;
    dayBranchRelation = `Nhật chi ${ganzhiData.branches[dbA].vi} – ${ganzhiData.branches[dbB].vi} hợp nhau: nếp sinh hoạt và tình cảm dễ hòa nhịp.`;
    songChungPoints.push(dayBranchRelation);
  } else if (dbRels.some((r) => r.type === 'luc_xung')) {
    tinhCamScore -= 12;
    songChungScore -= 14;
    dayBranchRelation = `Nhật chi ${ganzhiData.branches[dbA].vi} – ${ganzhiData.branches[dbB].vi} tương xung: khi sống chung cần thống nhất trước quy tắc sinh hoạt và tránh tranh luận lúc mệt.`;
    songChungPoints.push(dayBranchRelation);
  } else if (dbRels.some((r) => r.type === 'hinh' || r.type === 'hai')) {
    songChungScore -= 8;
    dayBranchRelation = `Nhật chi có nét tương hình/hại nhẹ: nên nói thẳng mong muốn thay vì giữ trong lòng.`;
    songChungPoints.push(dayBranchRelation);
  } else {
    dayBranchRelation = `Nhật chi ${ganzhiData.branches[dbA].vi} – ${ganzhiData.branches[dbB].vi} bình hòa, ít va chạm trực diện.`;
  }

  // 3) Tam hợp / Lục hợp theo tuổi (Niên chi)
  const ybA = chartA.year.pillar.branch;
  const ybB = chartB.year.pillar.branch;
  const ybRels = checkBranchPairRelations(ybA, ybB);
  let yearBranchRelation: string;
  if (ybRels.some((r) => r.type === 'luc_hop' || r.type === 'ban_tam_hop')) {
    lamAnScore += 12;
    songChungScore += 10;
    yearBranchRelation = `Tuổi ${ganzhiData.branches[ybA].vi} và ${ganzhiData.branches[ybB].vi} nằm trong thế Hợp: thuận lợi khi hợp tác đối ngoại và gia đạo.`;
    lamAnPoints.push(yearBranchRelation);
  } else if (ybRels.some((r) => r.type === 'luc_xung')) {
    lamAnScore -= 8;
    yearBranchRelation = `Tuổi ${ganzhiData.branches[ybA].vi} – ${ganzhiData.branches[ybB].vi} xung nhau về phong cách xã giao; làm ăn chung nên phân rõ mảng việc.`;
  } else {
    yearBranchRelation = `Niên chi ${ganzhiData.branches[ybA].vi} – ${ganzhiData.branches[ybB].vi} ở thế trung hòa.`;
  }

  // 4) Nạp âm trụ năm
  const nyA = chartA.year.nayin;
  const nyB = chartB.year.nayin;
  const nyRel = getElementRelation(nyA.element, nyB.element);
  let nayinRelation: string;
  if (nyRel === 'ta_sinh' || nyRel === 'sinh_ta' || nyRel === 'ty_hoa') {
    tinhCamScore += 6;
    nayinRelation = `Nạp âm ${nyA.vi} (${elementVi(nyA.element)}) và ${nyB.vi} (${elementVi(nyB.element)}) tương trợ/tỷ hòa.`;
  } else {
    nayinRelation = `Nạp âm ${nyA.vi} và ${nyB.vi} thuộc hai hành khắc chế, tạo sự cân bằng động.`;
  }

  // 5) Ngũ hành bù khuyết & Dụng thần bổ trợ
  const elements: ElementId[] = ['kim', 'moc', 'thuy', 'hoa', 'tho'];
  const strongestA = [...elements].sort(
    (x, y) => chartA.strength.elementDistribution[y] - chartA.strength.elementDistribution[x],
  )[0];
  const strongestB = [...elements].sort(
    (x, y) => chartB.strength.elementDistribution[y] - chartB.strength.elementDistribution[x],
  )[0];

  const aHelpsB =
    strongestA === chartB.usefulGod.dungThan || strongestA === chartB.usefulGod.hyThan;
  const bHelpsA =
    strongestB === chartA.usefulGod.dungThan || strongestB === chartA.usefulGod.hyThan;

  let usefulGodSynergy: string;
  if (aHelpsB && bHelpsA) {
    lamAnScore += 18;
    tinhCamScore += 12;
    usefulGodSynergy = `Hành vượng của người này đúng là Dụng/Hỷ thần của người kia (${elementVi(strongestA)} ↔ ${elementVi(strongestB)}): bổ trợ rất tốt khi phối hợp đường dài.`;
    lamAnPoints.push(usefulGodSynergy);
  } else if (aHelpsB || bHelpsA) {
    lamAnScore += 10;
    usefulGodSynergy = `Một bên có ngũ hành vượng trợ lực trực tiếp cho Dụng thần của bên kia (${elementVi(aHelpsB ? strongestA : strongestB)}).`;
    lamAnPoints.push(usefulGodSynergy);
  } else {
    usefulGodSynergy = `Dụng thần hai người (${elementVi(chartA.usefulGod.dungThan)} và ${elementVi(chartB.usefulGod.dungThan)}) độc lập, nên cùng chọn không gian/thời điểm trung hòa.`;
  }

  const elementComplement = `Người A vượng ${elementVi(strongestA)} (cần ${elementVi(chartA.usefulGod.dungThan)}); Người B vượng ${elementVi(strongestB)} (cần ${elementVi(chartB.usefulGod.dungThan)}).`;

  // 6) Mệnh quái Đông/Tây tứ mệnh
  const mqA = chartA.menhQuai.primary;
  const mqB = chartB.menhQuai.primary;
  let menhQuaiRelation: string;
  if (mqA.group === mqB.group) {
    songChungScore += 12;
    menhQuaiRelation = `Cùng thuộc ${mqA.groupVi} (Quái ${mqA.trigram.vi} & ${mqB.trigram.vi}): rất dễ chọn hướng nhà, bàn làm việc và không gian chung.`;
    songChungPoints.push(menhQuaiRelation);
  } else {
    menhQuaiRelation = `Một người thuộc ${mqA.groupVi} (${mqA.trigram.vi}), một người thuộc ${mqB.groupVi} (${mqB.trigram.vi}): khi bố trí chỗ ngồi riêng nên theo hướng tốt của từng người.`;
  }

  const clamp = (n: number) => Math.max(25, Math.min(96, Math.round(n)));
  tinhCamScore = clamp(tinhCamScore);
  lamAnScore = clamp(lamAnScore);
  songChungScore = clamp(songChungScore);
  const overallScore = Math.round((tinhCamScore + lamAnScore + songChungScore) / 3);

  const labelFor = (s: number) =>
    s >= 80 ? 'Rất hòa hợp' : s >= 65 ? 'Khá ăn ý' : s >= 50 ? 'Cần lắng nghe & bù đắp' : 'Nhiều khác biệt cần tôn trọng';

  // "Hôm nay hai người nên cùng làm gì"
  const todayAlm = computeDayAlmanac(todayInstant, tzOffsetMinutes, chartA);
  const bestHour = todayAlm.topHours[0] ?? todayAlm.hours[0];
  const todayTogetherSuggestions: string[] = [
    `Khung giờ thuận lợi để hai người cùng trò chuyện, ăn uống hoặc bàn kế hoạch hôm nay: giờ ${bestHour.branchVi} (${bestHour.hoursLabel}).`,
    `Hướng xuất hành/hẹn gặp hài hòa trong ngày: hướng ${todayAlm.xuatHanh.hyThanVi} (Hỷ thần) hoặc ${todayAlm.xuatHanh.taiThanVi} (Tài thần).`,
    todayAlm.isHoangDaoDay
      ? `Hôm nay là ngày Hoàng đạo (${todayAlm.hoangDaoDeity.vi}), thích hợp để hai người cùng xử lý một việc chung hoặc gặp gỡ bạn bè.`
      : `Hôm nay khí ngày thiên về tĩnh (${todayAlm.truc.vi}), hai người nên ưu tiên nghỉ ngơi nhẹ nhàng, nấu ăn hoặc dọn dẹp không gian sống thay vì tranh luận việc lớn.`,
  ];

  return {
    overallScore,
    summaryLabelVi: labelFor(overallScore),
    domains: {
      tinhCam: {
        score: tinhCamScore,
        labelVi: labelFor(tinhCamScore),
        points: tinhCamPoints.length ? tinhCamPoints : [dayMasterRelation],
      },
      lamAn: {
        score: lamAnScore,
        labelVi: labelFor(lamAnScore),
        points: lamAnPoints.length ? lamAnPoints : [usefulGodSynergy],
      },
      songChung: {
        score: songChungScore,
        labelVi: labelFor(songChungScore),
        points: songChungPoints.length ? songChungPoints : [dayBranchRelation, menhQuaiRelation],
      },
    },
    details: {
      dayMasterRelation,
      dayBranchRelation,
      yearBranchRelation,
      nayinRelation,
      elementComplement,
      usefulGodSynergy,
      menhQuaiRelation,
    },
    todayTogetherSuggestions,
  };
}
