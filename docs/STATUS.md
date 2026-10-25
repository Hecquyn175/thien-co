# STATUS — Trạng thái dự án Thiên Cơ

## Đã hoàn thành
- [x] **Giai đoạn 1:** Khung dự án (Vite + TypeScript strict + Vitest), GitHub Actions deploy Pages, tầng thời gian (`jdn.ts`, `tz.ts`, `astro.ts`, `solar-terms.ts`, `lunar-vn.ts`), kiểm chứng chéo 1900-2100 với `lunar-javascript` (mục 3.4 xanh), `tests/fixtures/verified-dates.json`.

## Đang thực hiện
- [ ] **Giai đoạn 2:** Can Chi 4 trụ, nạp âm, tàng can, giờ Tý, ngũ hành, quan hệ, thập thần.

## Chưa làm
- [ ] Giai đoạn 3 → 12 (xem `docs/PLAN.md`).

## Đang nghi ngờ / cần chủ dự án đối chiếu
- `tests/fixtures/verified-dates.json` có các mục `TODO_USER_VERIFY` quanh Tết, giao tiết Lập Xuân và ngày lệch âm lịch Việt–Trung.
- Bảng tỷ trọng tàng can (`src/data/hidden-stems.json`, `confidence: "B"`): quy ước đơn giản hóa `[1.0]`, `[0.7, 0.3]`, `[0.6, 0.3, 0.1]`.
