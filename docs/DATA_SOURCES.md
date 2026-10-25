# Nguồn Dữ liệu & Phân loại Độ tin cậy (`DATA_SOURCES.md`)

Toàn bộ dữ liệu tra cứu và văn bản dự đoán của **Thiên Cơ** nằm trong thư mục `src/data/`. Mỗi tệp JSON đều chứa trường `"meta": { "source": "...", "confidence": "A" | "B" | "C" }` để minh bạch hóa xuất xứ và mức độ thống nhất giữa các tài liệu cổ học.

---

## 1. Quy ước 3 mức độ tin cậy (A / B / C)

- **Mức A (Chuẩn thống nhất cao)**: Công thức toán học / thiên văn hoặc bảng tra cố định giống nhau ở hầu hết tài liệu kinh điển (JDN, 60 Hoa Giáp, Nạp âm, Ngũ Hổ độn, Ngũ Thử độn, Lục hợp, Lục xung, Tam hợp, Bát quái Hậu thiên, 64 Quẻ Chu Dịch).
- **Mức B (Có biến thể giữa các sách/phái)**: Đã chọn 1 phương án phổ biến nhất và ghi rõ trong `docs/DECISIONS.md` (Tỷ trọng Tàng can, thang điểm Thân vượng/nhược, Dụng thần Phù Ức + Điều hậu, 12 Trực, 28 Tú, một số sao Thần sát dân gian, Phi tinh ngày/giờ).
- **Mức C (Khác biệt lớn giữa các trường phái — Chỉ tham khảo)**: Kỳ Môn Độn Giáp Thời Gia (Chuyển Bàn, Sách Bổ pháp) và lời giải thích ứng dụng hiện đại của 64 quẻ. Luôn hiển thị nhãn *"Tham khảo, nhiều trường phái"* trên giao diện.

---

## 2. Bảng Tổng hợp Toàn bộ Tệp Dữ liệu (`src/data/`)

| Tệp dữ liệu | Nội dung | Nguồn đối chiếu chính | Độ tin cậy | Ghi chú / Điểm cần chủ dự án rà soát |
|---|---|---|---|---|
| [`src/data/ganzhi.json`](../src/data/ganzhi.json) | 10 Thiên Can, 12 Địa Chi, Ngũ hành, Âm Dương, 24 Tiết khí | *Tam Mệnh Thông Hội*, *Hiệp Kỷ Biện Phương Thư* | **A** | Chuẩn tuyệt đối. |
| [`src/data/nayin.json`](../src/data/nayin.json) | 30 cặp Nạp âm (60 Hoa Giáp) | *Tam Mệnh Thông Hội* | **A** | Chuẩn thống nhất. |
| [`src/data/hidden-stems.json`](../src/data/hidden-stems.json) | Tàng can trong 12 Địa Chi (Bản khí, Trung khí, Dư khí) & tỷ trọng | *Uyên Hải Tử Bình*, *Tử Bình Chân Thuyên* | **B** | Danh sách Can ẩn đạt mức A; tỷ trọng số học (`0.6/0.3/0.1`, `0.7/0.3`) là mức B (D5 trong `DECISIONS.md`). |
| [`src/data/relations.json`](../src/data/relations.json) | Ngũ hợp Can, Tương xung Can, Lục hợp, Tam hợp, Tam hội, Lục xung, Lục hại, Tương phá, Tương hình | *Tam Mệnh Thông Hội*, *Trích Thiên Tủy* | **A** | Chuẩn thống nhất. |
| [`src/data/truc.json`](../src/data/truc.json) | 12 Trực (Kiến, Trừ, Mãn, Bình, Định, Chấp, Phá, Nguy, Thành, Thu, Khai, Bế) & việc Nên/Kỵ | *Hiệp Kỷ Biện Phương Thư*, *Ngọc Hạp Thông Thư* | **B** | Quy tắc tính Trực theo Chi tháng tiết khí là mức A; danh mục việc nên/kỵ chi tiết từng Trực là mức B. |
| [`src/data/tu28.json`](../src/data/tu28.json) | 28 Sao (Nhị Thập Bát Tú), hành, con vật, cát/hung, việc Nên/Kỵ | *Hiệp Kỷ Biện Phương Thư*, đối chiếu chéo `lunar-javascript` | **B** | Điểm neo `2000-01-01 = Vị Thổ Trĩ` khớp 100% với `lunar-javascript`. |
| [`src/data/hoang-dao.json`](../src/data/hoang-dao.json) | 12 Thần Hoàng Đạo / Hắc Đạo (Thanh Long, Minh Đường... đến Câu Trận) | *Ngọc Hạp Thông Thư*, Lịch Vạn Niên Việt Nam | **A** | Khởi Thanh Long theo Chi tháng (ngày) và Chi ngày (giờ) thống nhất. |
| [`src/data/than-sat.json`](../src/data/than-sat.json) | 22+ Cát thần & Hung sát (Thiên Đức, Nguyệt Đức, Thiên Ất, Dịch Mã, Đào Hoa, Sát Chủ, Thọ Tử, Tam Nương, Nguyệt Kỵ...) | *Hiệp Kỷ Biện Phương Thư*, *Ngọc Hạp Ký* | **B** | **Chủ dự án nên rà soát**: Bảng *Sát Chủ* và *Thọ Tử* theo tháng âm lịch có 2 dị bản giữa lịch miền Bắc và lịch Ngọc Hạp cổ. |
| [`src/data/xuat-hanh.json`](../src/data/xuat-hanh.json) | Hướng Hỷ Thần, Tài Thần (theo Can ngày) & Hạc Thần (theo lịch 60 Hoa Giáp) | *Hiệp Kỷ Biện Phương Thư* | **B** | Hỷ Thần và Tài Thần thống nhất cao (A/B); bảng Hạc Thần chu kỳ 60 ngày nên đối chiếu thêm với lịch gia truyền nếu cần. |
| [`src/data/bagua.json`](../src/data/bagua.json) | 8 Quẻ đơn Bát Quái Hậu Thiên, hướng, hành, tượng | *Chu Dịch Thuyết Quái Truyện* | **A** | Chuẩn tuyệt đối. |
| [`src/data/menh-quai.json`](../src/data/menh-quai.json) | Bát Trạch Mệnh Quái (Đông/Tây tứ mệnh, 4 hướng tốt, 4 hướng xấu) | *Bát Trạch Minh Cảnh* | **A** | Công thức tính Quái số Nam/Nữ trước và sau năm 2000 chuẩn xác. |
| [`src/data/flying-stars.json`](../src/data/flying-stars.json) | Cửu Tinh Lạc Thư (1 Nhất Bạch .. 9 Cửu Tử) | *Thẩm Thị Huyền Không Học* | **B** | Phi tinh Năm và Tháng thống nhất cao; Phi tinh Ngày/Giờ tính theo tiết Đông Chí / Hạ Chí (Mức B). |
| [`src/data/qimen.json`](../src/data/qimen.json) | Kỳ Môn Độn Giáp Thời Gia (Bát Môn, Cửu Tinh, Bát Thần, định Cục theo 24 tiết khí) | *Kỳ Môn Độn Giáp Thống Tông* (Sách Bổ pháp rút gọn) | **C** | **Gắn cờ C**: Khác biệt giữa phái Sách Bổ, Phù Đầu và Trí Nhuận. Đã gắn nhãn *"Tham khảo, nhiều trường phái"* trên UI. |
| [`src/data/hexagrams.json`](../src/data/hexagrams.json) | 64 Quẻ Kinh Dịch (Tên Hán-Việt, Thượng/Hạ quái, 6 hào, Thoán từ, Ý nghĩa 4 nhóm) | *Chu Dịch* (bản dịch Ngô Tất Tố / Phan Bội Châu tham khảo) | **B/C** | Cấu trúc 64 quẻ, Quẻ Hỗ, Quẻ Biến đạt mức A; phần diễn giải ứng dụng 4 nhóm đời sống là mức B/C. |
| [`src/data/purposes.json`](../src/data/purposes.json) | 13 Mục đích chọn ngày (Cưới hỏi, Động thổ, Khai trương, Ký hợp đồng...) | Tổng hợp *Hiệp Kỷ Biện Phương Thư* & Bát Tự ứng dụng | **B** | Trọng số thưởng/phạt có thể tinh chỉnh thêm theo gu thực hành. |
| [`src/data/events/*.json`](../src/data/events/nguoi.json) | 60 Sự kiện dự đoán (`nguoi`: 15, `tien_bac`: 15, `cong_viec`: 16, `suc_khoe_di_chuyen`: 14) | Tổng hợp quy tắc Thập thần, Xung/Hợp/Hình/Hại, Thần sát | **B** | Đã qua kiểm định tự động `npm run lint:data` (không từ cấm, đủ lời khuyên bác sĩ cho nhóm sức khỏe). |
| [`src/data/templates/*.json`](../src/data/templates/overview.json) | 7 bộ mẫu câu (Tổng quan, Mở đầu nhóm, Khung giờ, Cân bằng, Lời nhắn, Hướng, Lưu ý y tế/tài chính) | Biên soạn nội bộ theo văn phong điềm đạm, xác suất | **B** | Không chứa văn bản cứng trong mã nguồn `.ts`. |
| [`src/data/glossary.json`](../src/data/glossary.json) | 242 thuật ngữ giải nghĩa nhanh (tap-to-explain) | Tổng hợp từ điển Mệnh lý & Lịch pháp | **A/B** | Phủ kín Can Chi, Thập thần, Thần sát, Trực, Tú, Bát quái, Phi tinh, Kỳ Môn. |
| [`tests/fixtures/verified-dates.json`](../tests/fixtures/verified-dates.json) | Bộ ngày kiểm chứng thực tế quanh Tết & ngày giao tiết khí | Chủ dự án đối chiếu lịch giấy uy tín | **A** | Có sẵn 5 mục `"status": "TODO_USER_VERIFY"` để chủ dự án điền xác nhận độc lập. |
