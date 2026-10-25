# Kiến trúc Hệ thống "Thiên Cơ" (`ARCHITECTURE.md`)

Tài liệu này mô tả kiến trúc phân tầng, thuật toán thiên văn tính 24 tiết khí & Âm lịch Việt Nam, cơ chế suy diễn sự kiện tất định (deterministic rule engine), và kiến trúc PWA chạy 100% offline.

---

## 1. Sơ đồ Phân tầng Tổng thể

```mermaid
flowchart TD
  subgraph Data["Tầng Dữ liệu Tĩnh (src/data/*.json)"]
    D1["Can Chi, Nạp Âm, Tàng Can, Quan hệ"]
    D2["Lịch Vạn Niên: 12 Trực, 28 Tú, Hoàng Đạo, Thần Sát, Xuất Hành"]
    D3["Hướng: Bát Quái, Mệnh Quái, Phi Tinh, Kỳ Môn, 64 Quẻ Dịch"]
    D4["60 Sự kiện (4 nhóm) + 7 Bộ Mẫu câu + 242 Thuật ngữ Glossary"]
  end

  subgraph Core["Tầng Lõi Thuần Khiết (src/core/ — Không DOM, Không Storage, Không Math.random)"]
    T1["Tầng Thời gian (jdn, astro, solar-terms, lunar-vn, tz)"]
    T2["Tầng Can Chi & Quan hệ (pillars, nayin, hidden-stems, elements, ten-gods)"]
    T3["Tầng Bát Tự Cá nhân (chart, strength, useful-god, luck-cycles, palaces)"]
    T4["Tầng Lịch Vạn Niên & Phương hướng (almanac/*, directions/*, iching/*)"]
    T5["Engine Dự đoán Sự kiện (signals -> scorer -> selector -> narrator -> explain)"]
    T6["Công cụ Chọn ngày & Hợp tuổi (picker/*, compat/*)"]
  end

  subgraph Infra["Tầng Hạ tầng & Giao diện (src/storage, src/workers, src/ui, src/pwa)"]
    W["Web Worker (calc.worker.ts) — Chạy nền Chọn ngày 180 ngày & Lịch tháng"]
    S["Storage (IndexedDB via idb + localStorage bọc try/catch + Migration)"]
    UI["Giao diện TS Thuần (5 Màn hình chính + La bàn SVG + Thẻ PNG + #/dev/fonts)"]
  end

  Data --> Core
  T1 --> T2 --> T3 --> T5
  T2 --> T4 --> T5
  T3 --> T6
  T4 --> T6
  Core --> W --> UI
  S --> UI
```

---

## 2. Thuật toán Thiên văn & Độ chính xác (`src/core/time/`)

### 2.1. Số ngày Julian (`JDN`) và Thời điểm Vật lý (`Instant`)
- Mọi phép tính nhận đầu vào tường minh gồm `instant` (epoch milliseconds UTC) và `tzOffsetMinutes` (mặc định `420` cho `Asia/Ho_Chi_Minh` UTC+7). Không phụ thuộc múi giờ ngầm của trình duyệt hay hệ điều hành.
- Công thức đổi ngày Dương lịch sang `JDN` (tại 12:00 trưa) theo Jean Meeus (*Astronomical Algorithms*, Chương 7), kiểm tra khứ hồi 100% từ năm 1800 đến 2200.

### 2.2. Kinh độ biểu kiến Mặt Trời & 24 Tiết khí (`astro.ts`, `solar-terms.ts`)
- Để đạt độ lệch **≤ 2 phút** so với lịch thiên văn chuẩn trên toàn dải **1900–2100** mà không cần đóng gói bảng tra hàng megabyte:
  1. Áp dụng chuỗi hài hòa **VSOP87D rút gọn** (tính kinh độ tâm nhật `L0`, `L1`, `L2`, `L3`) kết hợp hiệu chỉnh **Chương động (Nutation in longitude $\Delta\psi$)** và **Quang sai (Aberration $-20''.4898 / R$)** theo Meeus Chương 25 & 22.
  2. Hiệu chỉnh thang thời gian Động lực học Trái Đất ($\text{TT} - \text{UT} = \Delta T$) bằng đa thức nội suy từng đoạn của **Espenak & Meeus (NASA)** cho các thế kỷ 19, 20, 21.
  3. Dùng phương pháp lặp **Newton–Raphson / Secant** hội tụ về góc kinh độ hoàng đạo bội số của $15^\circ$ ($0^\circ$ Xuân Phân, $315^\circ$ Lập Xuân...).
- **Kết quả kiểm định thực tế (1900–2100)**: Đối chiếu toàn bộ $201 \times 24 = 4.824$ tiết khí với thư viện độc lập `lunar-javascript`: **độ lệch lớn nhất là 37.5 giây** (tại tiết Bạch Lộ năm 2052), vượt xa yêu cầu $\le 120$ giây.

### 2.3. Sóc (New Moon) & Âm lịch Việt Nam UTC+7 (`lunar-vn.ts`)
- Thời điểm Sóc (Trăng mới) tính theo thuật toán **Jean Meeus Chương 49** (chuỗi 24 số hạng chính + 14 số hạng hành tinh nhiễu loạn).
- Quy tắc **Âm lịch Việt Nam (UTC+7)** theo Hồ Ngọc Đức:
  - Ngày mùng 1 âm lịch là ngày địa phương (tính từ `00:00` đến `24:00` tại múi giờ UTC+7) chứa thời điểm Sóc.
  - Tháng 11 âm lịch luôn chứa tiết **Đông Chí** ($\lambda_{\odot} = 270^\circ$).
  - Nếu giữa hai tháng 11 âm lịch có 13 tháng âm lịch (năm nhuận), tháng đầu tiên **không chứa Trung khí** ($\lambda_{\odot}$ chia hết cho $30^\circ$) được đặt làm tháng nhuận.

---

## 3. Kiến trúc Engine Dự đoán Sự kiện (`src/core/events/`)

Engine hoạt động theo chuỗi 5 bước thuần hàm, hoàn toàn **deterministic**:

1. **Generator (`signals.ts`)**: Thu thập toàn bộ dữ kiện thời điểm và cá nhân vào bảng `facts: Record<string, string[]>` kèm danh sách `Signal` chuẩn hóa (Thập thần ngày/giờ/tháng/năm, Lục xung/Lục hợp/Tam hợp/Hình/Hại vào các cung Bản thân/Phối ngẫu/Sự nghiệp/Gốc/Con cái, Dụng thần/Kỵ thần, 12 Trực, 28 Tú, Thần sát, Đại vận/Lưu niên, Phi tinh, Kỳ Môn).
2. **Scorer (`scorer.ts`)**: Chấm điểm từng sự kiện trong 60 mẫu (`src/data/events/*.json`) dựa trên tổ hợp điều kiện `match` (`all`, `any`, `none`), nhân trọng số tầng thời gian (`Ngày = 1.0`, `Giờ = 0.7`, `Tháng = 0.4`, `Năm = 0.25`, `Đại vận = 0.3`) và dựng cây giải thích `ExplainNode`.
3. **Selector (`selector.ts`)**: Xử lý xung đột giữa các sự kiện trái chiều (`conflictsWith`: `dampen` giảm điểm hoặc `suppress` ẩn sự kiện yếu hơn), chọn tối đa 3 sự kiện/nhóm và tổng cộng $\le 10$ sự kiện/ngày, đảm bảo mỗi nhóm luôn có ít nhất 1 thẻ dự đoán.
4. **Narrator (`narrator.ts`)**: Chọn biến thể văn bản từ `src/data/templates/*.json` và `src/data/events/*.json` bằng bộ sinh số giả ngẫu nhiên có seed (`mulberry32` + `fnv1aHash32` trong `src/core/rng.ts`) với khóa `seed = "${dateISO}:${profileId}:${eventId}:${ENGINE_VERSION}"`.
5. **Explain (`explain.ts`)**: Cung cấp cấu trúc truy vết minh bạch để UI hiển thị khi người dùng bấm **"Vì sao?"**.

---

## 4. Hiệu năng, Web Worker & Offline PWA

- **Tách luồng tính toán nặng (`src/workers/calc.worker.ts`)**: Các tác vụ quét nhiều ngày (Chọn ngày tốt trong 60–180 ngày, tính điểm vận cả tháng trên Lịch tháng) chạy trên Web Worker để giao diện chính luôn mượt ở 60fps; tự động fallback về đồng bộ nếu môi trường không hỗ trợ Worker.
- **Tốc độ tính toán**: Benchmark thực tế tính `predictDayEvents` cho 365 ngày liên tiếp chỉ mất **~107ms** (yêu cầu < 1.500ms).
- **Dung lượng gói**: Bản build production toàn bộ ứng dụng + dữ liệu JSON nén gzip đạt **~126 KB** (yêu cầu < 250 KB gzip), được Workbox (`vite-plugin-pwa`) precache 100% để hoạt động hoàn toàn không cần mạng.
