# Trạng thái Dự án "Thiên Cơ" (`STATUS.md`)

Cập nhật lần cuối: Hoàn tất 12/12 giai đoạn.

---

## 1. Những hạng mục ĐÃ XONG (100%)

- **Tầng Thời gian & Can Chi (`src/core/time/`, `src/core/ganzhi/`)**:
  - JDN, 24 tiết khí (VSOP87D rút gọn, lệch tối đa 37.5 giây so với `lunar-javascript` trong 200 năm 1900–2100), Âm lịch Việt Nam UTC+7 (khứ hồi 100% 1900–2100), 4 trụ Năm/Tháng/Ngày/Giờ với 2 quy ước Giờ Tý (`23h` và `00h`).
- **Tầng Quan hệ, Bát Tự & Lịch Vạn Niên (`src/core/relations/`, `src/core/bazi/`, `src/core/almanac/`)**:
  - 60 Nạp âm, Tàng can, Ngũ hành, Quan hệ Can Chi, Thập thần 10×10, Thân vượng/nhược, Dụng/Hỷ/Kỵ thần, Đại vận 10 năm, Cung vị, Mệnh quái, 12 Trực, 28 Tú, 12 thần Hoàng/Hắc đạo, 22+ sao Thần sát, Hướng xuất hành.
- **Engine Dự đoán Sự kiện & Nội dung (`src/core/events/`, `src/data/events/`, `src/data/templates/`)**:
  - 60 sự kiện thuộc 4 nhóm, 7 bộ mẫu câu, 242 thuật ngữ Glossary, 64 quẻ Kinh Dịch, Phi tinh Năm/Tháng/Ngày/Giờ, Kỳ Môn Thời Gia.
  - Linter dữ liệu `npm run lint:data` xanh (0 từ cấm, 100% sự kiện sức khỏe có câu khuyên bác sĩ, 0 chuỗi dự đoán cứng trong `.ts`).
- **Giao diện, Web Worker, Lưu trữ & PWA (`src/ui/`, `src/workers/`, `src/storage/`, `src/pwa/`)**:
  - 5 màn hình chính (`Hôm nay`, `Lịch tháng`, `Hướng`, `Công cụ`, `Hồ sơ & Cài đặt`) + màn hình kiểm định font/glyph `#/dev/fonts`.
  - Web Worker xử lý Chọn ngày tốt (7–180 ngày) và Lịch tháng mượt mà.
  - IndexedDB + localStorage + Migration + Xuất/Nhập JSON + Xóa toàn bộ dữ liệu.
  - Service Worker (`vite-plugin-pwa`) precache 17 entries (~126 KB gzip), chạy 100% offline.

---

## 2. Những hạng mục CHƯA XONG

- Không còn hạng mục chức năng nào trong đặc tả chưa hoàn thành.

---

## 3. Những điểm ĐANG GẮN CỜ B/C hoặc CẦN CHỦ DỰ ÁN KIỂM ĐỊNH THÊM

1. **Bộ ngày kiểm chứng thủ công (`tests/fixtures/verified-dates.json`)**:
   - Đã có các mục `"status": "VERIFIED"` và 5 mục `"status": "TODO_USER_VERIFY"` quanh Tết âm lịch và ngày giao tiết Lập Xuân để chủ dự án tự đối chiếu với lịch giấy vạn niên uy tín tại Việt Nam rồi chuyển sang `"VERIFIED"`.
2. **Dị bản Thần sát dân gian (`src/data/than-sat.json` — Mức B)**:
   - Bảng tra sao *Sát Chủ* và *Thọ Tử* theo tháng âm lịch có 2 dị bản giữa Ngọc Hạp Thông Thư và lịch vạn niên hiện đại; hiện đang dùng bản phổ biến nhất và ghi chú rõ trong `than-sat.json`.
3. **Phi tinh Ngày/Giờ (`src/core/directions/flying-stars.ts` — Mức B)**:
   - Đang áp dụng phép Dương độn (sau Đông Chí) / Âm độn (sau Hạ Chí) theo Tam nguyên tiết khí phổ thông.
4. **Kỳ Môn Độn Giáp Thời Gia (`src/core/directions/qimen.ts` — Mức C)**:
   - Đang dùng Chuyển Bàn kết hợp Sách Bổ pháp (拆補法) rút gọn; đã gắn nhãn cảnh báo mức C (*"Tham khảo, nhiều trường phái"*) trên giao diện La bàn và Cửu Cung.
