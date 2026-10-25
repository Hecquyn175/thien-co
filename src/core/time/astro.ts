/**
 * Thiên văn cơ bản: kinh độ biểu kiến của Mặt Trời (VSOP87D rút gọn, Meeus App. III)
 * và thời điểm Trăng mới (Meeus ch. 49), ΔT (Espenak & Meeus).
 *
 * Độ chính xác (xem docs/ARCHITECTURE.md): kinh độ Mặt Trời ~ vài giây cung
 * (≈ dưới 1 phút thời gian cho tiết khí); Trăng mới ~ vài chục giây.
 * Không dùng Math.random / Date.now: hàm thuần.
 */

const RAD = Math.PI / 180;

/** Chuẩn hóa góc về [0, 360). */
export function norm360(x: number): number {
  const r = x % 360;
  return r < 0 ? r + 360 : r;
}

/** Chuẩn hóa góc về [-180, 180). */
export function norm180(x: number): number {
  const r = norm360(x);
  return r >= 180 ? r - 360 : r;
}

/** ΔT = TT - UT (giây), xấp xỉ đa thức của Espenak & Meeus cho 1900-2150. */
export function deltaT(decimalYear: number): number {
  const y = decimalYear;
  let t: number;
  if (y < 1900) {
    return deltaT(1900);
  } else if (y < 1920) {
    t = y - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  } else if (y < 1941) {
    t = y - 1920;
    return 21.2 + 0.84493 * t - 0.0761 * t ** 2 + 0.0020936 * t ** 3;
  } else if (y < 1961) {
    t = y - 1950;
    return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547;
  } else if (y < 1986) {
    t = y - 1975;
    return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
  } else if (y < 2005) {
    t = y - 2000;
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t ** 2 +
      0.0017275 * t ** 3 +
      0.000651814 * t ** 4 +
      0.00002373599 * t ** 5
    );
  } else if (y < 2050) {
    t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
  } else if (y < 2150) {
    return -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y);
  }
  const u = (y - 1820) / 100;
  return -20 + 32 * u * u;
}

/** Năm thập phân từ JD (xấp xỉ, đủ cho ΔT). */
export function decimalYearFromJd(jd: number): number {
  return 2000 + (jd - 2451545) / 365.2425;
}

// ---- VSOP87D Trái Đất: kinh độ nhật tâm L (đơn vị 1e-8 rad), [A, B, C] cho A·cos(B + C·τ) ----
type Series = ReadonlyArray<readonly [number, number, number]>;

const L0: Series = [
  [175347046, 0, 0], [3341656, 4.6692568, 6283.07585], [34894, 4.6261, 12566.1517],
  [3497, 2.7441, 5753.3849], [3418, 2.8289, 3.5231], [3136, 3.6277, 77713.7715],
  [2676, 4.4181, 7860.4194], [2343, 6.1352, 3930.2097], [1324, 0.7425, 11506.7698],
  [1273, 2.0371, 529.691], [1199, 1.1096, 1577.3435], [990, 5.233, 5884.927],
  [902, 2.045, 26.298], [857, 3.508, 398.149], [780, 1.179, 5223.694],
  [753, 2.533, 5507.553], [505, 4.583, 18849.228], [492, 4.205, 775.523],
  [357, 2.92, 0.067], [317, 5.849, 11790.629], [284, 1.899, 796.298],
  [271, 0.315, 10977.079], [243, 0.345, 5486.778], [206, 4.806, 2544.314],
  [205, 1.869, 5573.143], [202, 2.458, 6069.777], [156, 0.833, 213.299],
  [132, 3.411, 2942.463], [126, 1.083, 20.775], [115, 0.645, 0.98],
  [103, 0.636, 4694.003], [102, 0.976, 15720.839], [102, 4.267, 7.114],
  [99, 6.21, 2146.17], [98, 0.68, 155.42], [86, 5.98, 161000.69],
  [85, 1.3, 6275.96], [85, 3.67, 71430.7], [80, 1.81, 17260.15],
  [79, 3.04, 12036.46], [75, 1.76, 5088.63], [74, 3.5, 3154.69],
  [74, 4.68, 801.82], [70, 0.83, 9437.76], [62, 3.98, 8827.39],
  [61, 1.82, 7084.9], [57, 2.78, 6286.6], [56, 4.39, 14143.5],
  [56, 3.47, 6279.55], [52, 0.19, 12139.55], [52, 1.33, 1748.02],
  [51, 0.28, 5856.48], [49, 0.49, 1194.45], [41, 5.37, 8429.24],
  [41, 2.4, 19651.05], [39, 6.17, 10447.39], [37, 6.04, 10213.29],
  [37, 2.57, 1059.38], [36, 1.71, 2352.87], [36, 1.78, 6812.77],
  [33, 0.59, 17789.85], [30, 0.44, 83996.85], [30, 2.74, 1349.87],
  [25, 3.16, 4690.48],
];
const L1: Series = [
  [628331966747, 0, 0], [206059, 2.678235, 6283.07585], [4303, 2.6351, 12566.1517],
  [425, 1.59, 3.523], [119, 5.796, 26.298], [109, 2.966, 1577.344],
  [93, 2.59, 18849.23], [72, 1.14, 529.69], [68, 1.87, 398.15],
  [67, 4.41, 5507.55], [59, 2.89, 5223.69], [56, 2.17, 155.42],
  [45, 0.4, 796.3], [36, 0.47, 775.52], [29, 2.65, 7.11],
  [21, 5.34, 0.98], [19, 1.85, 5486.78], [19, 4.97, 213.3],
  [17, 2.99, 6275.96], [16, 0.03, 2544.31], [16, 1.43, 2146.17],
  [15, 1.21, 10977.08], [12, 2.83, 1748.02], [12, 3.26, 5088.63],
  [12, 5.27, 1194.45], [12, 2.08, 4694], [11, 0.77, 553.57],
  [10, 1.3, 6286.6], [10, 4.24, 1349.87], [9, 2.7, 242.73],
  [9, 5.64, 951.72], [8, 5.3, 2352.87], [6, 2.65, 9437.76],
  [6, 4.67, 4690.48],
];
const L2: Series = [
  [52919, 0, 0], [8720, 1.0721, 6283.0758], [309, 0.867, 12566.152],
  [27, 0.05, 3.52], [16, 5.19, 26.3], [16, 3.68, 155.42],
  [10, 0.76, 18849.23], [9, 2.06, 77713.77], [7, 0.83, 775.52],
  [5, 4.66, 1577.34], [4, 1.03, 7.11], [4, 3.44, 5573.14],
  [3, 5.14, 796.3], [3, 6.05, 5507.55], [3, 1.19, 242.73],
  [3, 6.12, 529.69], [3, 0.31, 398.15], [3, 2.28, 553.57],
  [2, 4.38, 5223.69], [2, 3.75, 0.98],
];
const L3: Series = [
  [289, 5.844, 6283.076], [35, 0, 0], [17, 5.49, 12566.15],
  [3, 5.2, 155.42], [1, 4.72, 3.52], [1, 5.3, 18849.23], [1, 5.97, 242.73],
];
const L4: Series = [[114, 3.142, 0], [8, 4.13, 6283.08], [1, 3.84, 12566.15]];
const L5: Series = [[1, 3.14, 0]];

function sumSeries(s: Series, tau: number): number {
  let r = 0;
  for (const [a, b, c] of s) r += a * Math.cos(b + c * tau);
  return r;
}

/** Kinh độ biểu kiến của Mặt Trời (độ, 0..360) tại JDE (thời gian động lực, TT). */
export function sunApparentLongitudeTT(jde: number): number {
  const tau = (jde - 2451545) / 365250;
  const T = tau * 10;
  const Lh =
    (sumSeries(L0, tau) +
      sumSeries(L1, tau) * tau +
      sumSeries(L2, tau) * tau ** 2 +
      sumSeries(L3, tau) * tau ** 3 +
      sumSeries(L4, tau) * tau ** 4 +
      sumSeries(L5, tau) * tau ** 5) /
    1e8; // rad
  // Kinh độ địa tâm của Mặt Trời = kinh độ nhật tâm của Trái Đất + 180°
  let theta = norm360(Lh / RAD + 180);
  // Hiệu chỉnh sang hệ FK5 (Meeus ch. 25): -0.09033"
  theta -= 0.09033 / 3600;

  // Bán kính vectơ (đủ chính xác cho quang sai)
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * RAD;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M);
  const nu = M + C * RAD;
  const R = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(nu));

  // Chương động theo kinh độ (Δψ), Meeus ch. 22 rút gọn (giây cung)
  const omega = (125.04452 - 1934.136261 * T) * RAD;
  const Ls = (280.4665 + 36000.7698 * T) * RAD;
  const Lm = (218.3165 + 481267.8813 * T) * RAD;
  const dpsi =
    -17.2 * Math.sin(omega) -
    1.32 * Math.sin(2 * Ls) -
    0.23 * Math.sin(2 * Lm) +
    0.21 * Math.sin(2 * omega);
  // Quang sai
  const aberration = -20.4898 / R;
  return norm360(theta + (dpsi + aberration) / 3600);
}

/** Kinh độ biểu kiến của Mặt Trời tại JD theo UT (độ). */
export function sunApparentLongitudeUT(jdUT: number): number {
  const dt = deltaT(decimalYearFromJd(jdUT));
  return sunApparentLongitudeTT(jdUT + dt / 86400);
}

/**
 * JDE (TT) của Trăng mới thứ k (k = 0 gần 2000-01-06). Meeus ch. 49.
 */
export function newMoonJDE(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;
  let jde =
    2451550.09766 +
    29.530588861 * k +
    0.00015437 * T2 -
    0.00000015 * T3 +
    0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = norm360(2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3) * RAD;
  const Mp =
    norm360(201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) *
    RAD;
  const F =
    norm360(160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) *
    RAD;
  const Om = norm360(124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * RAD;

  const corr =
    -0.4072 * Math.sin(Mp) +
    0.17241 * E * Math.sin(M) +
    0.01608 * Math.sin(2 * Mp) +
    0.01039 * Math.sin(2 * F) +
    0.00739 * E * Math.sin(Mp - M) -
    0.00514 * E * Math.sin(Mp + M) +
    0.00208 * E * E * Math.sin(2 * M) -
    0.00111 * Math.sin(Mp - 2 * F) -
    0.00057 * Math.sin(Mp + 2 * F) +
    0.00056 * E * Math.sin(2 * Mp + M) -
    0.00042 * Math.sin(3 * Mp) +
    0.00042 * E * Math.sin(M + 2 * F) +
    0.00038 * E * Math.sin(M - 2 * F) -
    0.00024 * E * Math.sin(2 * Mp - M) -
    0.00017 * Math.sin(Om) -
    0.00007 * Math.sin(Mp + 2 * M) +
    0.00004 * Math.sin(2 * Mp - 2 * F) +
    0.00004 * Math.sin(3 * M) +
    0.00003 * Math.sin(Mp + M - 2 * F) +
    0.00003 * Math.sin(2 * Mp + 2 * F) -
    0.00003 * Math.sin(Mp + M + 2 * F) +
    0.00003 * Math.sin(Mp - M + 2 * F) -
    0.00002 * Math.sin(Mp - M - 2 * F) -
    0.00002 * Math.sin(3 * Mp + M) +
    0.00002 * Math.sin(4 * Mp);

  const A = [
    [299.77 + 0.107408 * k - 0.009173 * T2, 0.000325],
    [251.88 + 0.016321 * k, 0.000165],
    [251.83 + 26.651886 * k, 0.000164],
    [349.42 + 36.412478 * k, 0.000126],
    [84.66 + 18.206239 * k, 0.00011],
    [141.74 + 53.303771 * k, 0.000062],
    [207.14 + 2.453732 * k, 0.00006],
    [154.84 + 7.30686 * k, 0.000056],
    [34.52 + 27.261239 * k, 0.000047],
    [207.19 + 0.121824 * k, 0.000042],
    [291.34 + 1.844379 * k, 0.00004],
    [161.72 + 24.198154 * k, 0.000037],
    [239.56 + 25.513099 * k, 0.000035],
    [331.55 + 3.592518 * k, 0.000023],
  ] as const;
  let planetary = 0;
  for (const [arg, amp] of A) planetary += amp * Math.sin(norm360(arg) * RAD);

  jde += corr + planetary;
  return jde;
}

/** JD (UT) của Trăng mới thứ k. */
export function newMoonJdUT(k: number): number {
  const jde = newMoonJDE(k);
  return jde - deltaT(decimalYearFromJd(jde)) / 86400;
}
