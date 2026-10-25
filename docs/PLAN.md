# Kế hoạch Triển khai 12 Giai đoạn — Dự án "Thiên Cơ" (`PLAN.md`)

Tất cả 12 giai đoạn đã được hoàn thành tuần tự, kiểm thử xanh (`npm test` + `npm run lint:data`) và đóng gói thành công (`npm run build`).

---

## Danh sách 12 Giai đoạn

- [x] **Giai đoạn 1 — Khởi tạo, CI, tầng thời gian & đối chiếu chéo (`7d8de3e`)**
  - Khởi tạo Vite + TypeScript (strict) + Vitest + GitHub Actions workflow (`deploy.yml`).
  - Cài đặt `jdn.ts`, `tz.ts`, `astro.ts` (VSOP87D rút gọn + Meeus Ch. 49), `solar-terms.ts`, `lunar-vn.ts` (UTC+7), `pillars.ts`, `hour-pillar.ts`.
  - Đối chiếu chéo 1900–2100 với `lunar-javascript`: tiết khí lệch tối đa 37.5 giây (≤ 2 phút), Can Chi năm/tháng/ngày/giờ khớp 100%, âm lịch khứ hồi 1900–2100.
  - Tạo `tests/fixtures/verified-dates.json` và `docs/VERIFICATION.md`.

- [x] **Giai đoạn 2 — Can Chi mở rộng, Ngũ hành, Quan hệ, Thập thần (`8eb2536`)**
  - Cài đặt 60 Hoa Giáp Nạp âm (`nayin.ts`), Tàng can (`hidden-stems.ts`), Ngũ hành sinh khắc (`elements.ts`), Quan hệ Can Chi (`stem-branch-relations.ts`: ngũ hợp, lục hợp, tam hợp, bán tam hợp, tam hội, lục xung, lục hại, tương phá, tương hình), Thập thần 10×10 (`ten-gods.ts`), và PRNG có seed (`rng.ts`).

- [x] **Giai đoạn 3 — Bát Tự cá nhân (`a8e760e`)**
  - Lập lá số `chart.ts` (hỗ trợ cả sinh âm lịch và không rõ giờ sinh), tính độ vượng suy Nhật chủ (`strength.ts`), chọn Dụng thần / Hỷ thần / Kỵ thần theo Phù Ức + Điều hậu (`useful-god.ts`), tính Đại vận 10 năm (`luck-cycles.ts`), Cung vị (`palaces.ts`) và Mệnh quái Bát trạch (`menh-quai.ts`).

- [x] **Giai đoạn 4 — Lịch vạn niên Việt (`e315f0d`)**
  - Cài đặt 12 Trực (`truc.ts`), 28 Tú (`tu28.ts` — đối chiếu chéo với `lunar-javascript`), 12 thần Hoàng Đạo / Hắc Đạo (`hoang-dao.ts`), 22+ sao Thần sát (`than-sat.ts`), Hướng xuất hành Hỷ/Tài/Hạc thần (`xuat-hanh.ts`), và tổng hợp Giờ đẹp / Việc nên kỵ (`gio-dep.ts`).

- [x] **Giai đoạn 5 — Engine dự đoán sự kiện (`4a26fd1`)**
  - Thiết kế schema quy tắc trong `docs/RULES_SCHEMA.md`.
  - Cài đặt `signals.ts`, `scorer.ts`, `selector.ts`, `narrator.ts`, `explain.ts`.
  - Viết script `scripts/lint-data.ts` kiểm tra tính hợp lệ, từ cấm, câu khuyên bác sĩ và cấm chuỗi dài cứng trong code `.ts`.

- [x] **Giai đoạn 6 — Nội dung 60 sự kiện + mẫu câu (`4a26fd1`)**
  - Biên soạn 60 sự kiện chia 4 nhóm (`nguoi.json`: 15, `tien_bac.json`: 15, `cong_viec.json`: 16, `suc_khoe_di_chuyen.json`: 14) và 7 bộ mẫu câu trong `src/data/templates/*.json`.

- [x] **Giai đoạn 7 — Lưu trữ, Hồ sơ, Cài đặt & Giao diện nền (`56ad516`, `b17d1f7`)**
  - Cài đặt `src/storage/index.ts` (IndexedDB qua `idb` với RAM fallback cho test, `localStorage` bọc `try/catch`, hàm `migrateBackupPayload`, xuất/nhập JSON, xóa toàn bộ dữ liệu).
  - Thiết kế hệ thống giao diện *"Hiện đại nhưng có chất cổ"* (`src/ui/styles.css`), tự host font stack offline (`public/fonts/fonts.css`), trang kiểm định `#/dev/fonts`, onboarding 3 bước, và màn hình Hồ sơ & Cài đặt.

- [x] **Giai đoạn 8 — Màn hình Hôm nay & Lịch tháng (`b17d1f7`)**
  - Xây dựng màn hình **Hôm nay** (`today.ts`) với đồng hồ điểm vận bán nguyệt, 4 nhóm sự kiện kèm cây truy vết *"Vì sao?"*, dải 12 canh giờ, la bàn 8 hướng, việc nên/kỵ, và xuất thẻ PNG (`share-card.ts`).
  - Xây dựng màn hình **Lịch tháng** (`calendar.ts`) tính toán qua Web Worker, bộ lọc *"Chỉ ngày tốt cho mình"*, chấm biểu tượng màu + hình học cho người mù màu.

- [x] **Giai đoạn 9 — Chọn ngày theo mục đích & Hợp tuổi (`56ad516`, `b17d1f7`)**
  - Cài đặt `src/core/picker/rank.ts` (13 mục đích, quét 7–180 ngày trên Web Worker, hỗ trợ hồ sơ thứ 2) và `src/core/compat/compat.ts` (đối chiếu 2 hồ sơ trên 3 lĩnh vực + gợi ý làm gì cùng nhau hôm nay).

- [x] **Giai đoạn 10 — Kinh Dịch (64 quẻ) & Nhật ký đối chiếu (`4a26fd1`, `56ad516`, `b17d1f7`)**
  - Hoàn thiện `src/data/hexagrams.json` (đủ 64 quẻ), 3 phương pháp lập quẻ (`cast.ts`), lưu lịch sử IndexedDB, và công cụ Nhật ký cuối ngày + thống kê đối chiếu thực tế (`computeJournalStats`).

- [x] **Giai đoạn 11 — Phi tinh, Kỳ Môn & La bàn 8 hướng (`4a26fd1`, `b17d1f7`)**
  - Hoàn thiện `flying-stars.ts`, `qimen.ts` (gắn cờ C minh bạch), màn hình **Hướng** (`directions.ts`) với bàn cờ Cửu Cung Lạc Thư 3×3 và từ điển 242 thuật ngữ (`glossary.json`).

- [x] **Giai đoạn 12 — PWA, Tài liệu & Kiểm định cuối**
  - Cấu hình `vite-plugin-pwa` precache toàn bộ tài nguyên offline, biểu tượng `192x192`, `512x512`, `maskable`, thông báo *"Có bản mới, tải lại"*.
  - Hoàn thiện `README.md`, `docs/ARCHITECTURE.md`, `docs/DATA_SOURCES.md`, `docs/DECISIONS.md`, `docs/VERIFICATION.md`, `docs/STATUS.md`.
