# VERIFICATION — đối chiếu và các ô cần chủ dự án kiểm chứng

## 1. Đối chiếu chéo với thư viện độc lập (tự động, `npm test`)
Thư viện đối chiếu (devDependency, không vào bundle): `lunar-javascript` 1.7.x.

| Hạng mục | Phạm vi | Kết quả |
|---|---|---|
| 24 tiết khí (thời điểm vật lý) | 1900-2100 (4824 mốc) | Lệch tối đa ≈ 38 giây (ngưỡng cho phép 120 giây) |
| Can Chi ngày | mọi ngày 1900-01-01…2100-12-31 | Khớp 100% |
| Can Chi tháng/năm (theo thời điểm tiết) | mọi ngày × 3 mốc giờ + ±5 phút quanh mọi "tiết" | Khớp 100% |
| Can Chi giờ | mỗi 5 ngày × 24 giờ, hai quy ước giờ Tý | Khớp (xem chú thích 3) |
| Âm lịch (cùng múi giờ UTC+8) | 1900-2100 | Khớp, trừ các ngoại lệ ở mục 2 |
| Khứ hồi dương↔âm, JDN↔dương | 1900-2100 | Khớp 100% |

## 2. Các chỗ lệch đã giải thích
1. **Âm lịch trước 1929 (≈ 90 ngày, vd 1914-11-17…):** thư viện dùng giờ địa phương Bắc Kinh (UTC+7:45:40) trước 1929; ta dùng múi giờ đồng đều. Không ảnh hưởng âm lịch Việt (UTC+7, theo quy ước).
2. **Tháng bắt đầu 2057-09-28 (UTC+8):** Trăng mới lúc **23:59:57** giờ Bắc Kinh — cách nửa đêm 3 giây, nằm trong sai số của thuật toán Meeus ch. 49; thư viện xếp sang ngày kế. 30 ngày bị ảnh hưởng ở phép so khớp UTC+8. Với UTC+7 thời điểm này là 22:59:57 nên **không ảnh hưởng** lịch Việt.
3. **Giờ Tý muộn (23h-24h) với `day_changes_at_00`:** Can giờ lấy từ Can ngày của chính hôm đó (D4); `lunar-javascript` sect 2 lấy từ Can ngày hôm sau. Test chỉ so khớp quy ước 00h cho giờ 0..22.

## 3. Cần chủ dự án kiểm chứng (đối chiếu lịch vạn niên uy tín)
Điền vào `tests/fixtures/verified-dates.json` (các mục `TODO_USER_VERIFY`):
- [ ] Mùng 1 Tết 2025, 2026 (và một vài năm khác).
- [ ] Một ngày mà âm lịch Việt khác Trung Quốc (các ngày sóc/tiết sát nửa đêm).
- [ ] Giờ giao Lập Xuân 2026 và Can Chi năm/tháng trước/sau.
- [ ] Tháng nhuận 2025 (nhuận tháng 6 bắt đầu 2025-07-25).
- [ ] Hồ sơ mẫu của chủ dự án: so Tứ trụ với phần mềm Bát Tự đang tin dùng.

> Các bảng dữ liệu (Trực, Tú, thần sát, Kỳ Môn, Phi tinh...) và mức A/B/C: xem `docs/DATA_SOURCES.md`.
