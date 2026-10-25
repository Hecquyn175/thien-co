# STATUS — Trạng thái dự án Thiên Cơ

## Đã hoàn thành
- [x] **Giai đoạn 1:** Khung dự án (Vite + TypeScript strict + Vitest), GitHub Actions deploy Pages, tầng thời gian (`jdn.ts`, `tz.ts`, `astro.ts`, `solar-terms.ts`, `lunar-vn.ts`), kiểm chứng chéo 1900-2100 với `lunar-javascript` (mục 3.4 xanh), `tests/fixtures/verified-dates.json`.
- [x] **Giai đoạn 2:** Can Chi 4 trụ, nạp âm 60 Hoa Giáp, tàng can, giờ Tý, ngũ hành sinh khắc, quan hệ Can Chi (ngũ hợp, lục hợp, tam hợp, tam hội, lục xung, hình, hại, phá), thập thần 10×10 (đối chiếu chéo xanh).
- [x] **Giai đoạn 3:** Bát Tự cá nhân (`chart.ts`, `strength.ts`, `useful-god.ts`, `luck-cycles.ts`, `palaces.ts`, `menh-quai.ts`, `bagua.ts`), snapshot 3 hồ sơ mẫu xanh.

## Đang thực hiện
- [ ] **Giai đoạn 4:** Dữ liệu xem ngày: Trực, Tú, Hoàng đạo, thần sát, xuất hành, giờ đẹp + `lint:data`.

## Chưa làm
- [ ] Giai đoạn 3 → 12 (xem `docs/PLAN.md`).

## Đang nghi ngờ / cần chủ dự án đối chiếu
- `tests/fixtures/verified-dates.json` có các mục `TODO_USER_VERIFY` quanh Tết, giao tiết Lập Xuân và ngày lệch âm lịch Việt–Trung.
- Bảng tỷ trọng tàng can (`src/data/hidden-stems.json`, `confidence: "B"`): quy ước đơn giản hóa `[1.0]`, `[0.7, 0.3]`, `[0.6, 0.3, 0.1]`.
