# Thiên Cơ (天機) — Hệ thống dự đoán sự kiện theo Can Chi & Lịch Vạn Niên (PWA Offline)

**Thiên Cơ** là ứng dụng web tĩnh (Progressive Web App - PWA) chạy **100% offline** sau lần tải đầu, được thiết kế để tra cứu Lịch Vạn Niên Việt Nam (UTC+7), lập lá số Bát Tự (Tứ Trụ), dự đoán các sự kiện có thể xảy ra xung quanh người dùng theo thời điểm (Năm / Tháng / Ngày / Giờ), xem phương hướng (Bát Quái, Mệnh Quái, Huyền Không Phi Tinh, Kỳ Môn Độn Giáp) và gieo quẻ Kinh Dịch.

---

## 1. Tính năng cốt lõi

1. **Tầng Thời gian & Lịch Vạn Niên Việt Nam (Mức tin cậy A)**:
   - Tính số ngày Julian (`JDN`), 24 tiết khí theo kinh độ Mặt Trời thực (VSOP87D rút gọn, sai số cực đại ≤ 37.5 giây trên toàn dải 1900–2100 khi đối chiếu với `lunar-javascript`).
   - Âm lịch Việt Nam theo múi giờ **UTC+7** (xử lý tháng nhuận không trung khí chuẩn xác, khứ hồi 100% trong 200 năm 1900–2100).
   - Hỗ trợ cả hai quy ước Giờ Tý (`23:00–01:00`): đổi ngày lúc `23:00` (mặc định) hoặc đổi ngày lúc `00:00`.
2. **Cá nhân hóa theo Tứ Trụ / Bát Tự (Mức tin cậy A/B)**:
   - Lập 4 trụ Năm (đổi tại Lập Xuân), Tháng (theo tiết khí), Ngày, Giờ (hỗ trợ cả hồ sơ không rõ giờ sinh).
   - Phân tích 60 Hoa Giáp Nạp Âm, Tàng Can, Thập Thần (`10×10`), Thân Vượng / Thân Nhược, Dụng Thần / Hỷ Thần / Kỵ Thần (Phù Ức kết hợp Điều Hậu), Đại Vận 10 năm, Lưu Niên, Lưu Nguyệt và Mệnh Quái.
3. **Engine Dự đoán Sự kiện Truy vết được (Deterministic 100%)**:
   - Không dùng AI/LLM lúc chạy, không dùng `Math.random()`. Cùng đầu vào luôn cho cùng đầu ra.
   - 60 mẫu sự kiện chia làm 4 nhóm: **Quan hệ & Con người**, **Tài chính & Tiền bạc**, **Công việc / Học tập / Giấy tờ**, **Sức khỏe / Di chuyển / Thay đổi**.
   - Mỗi thẻ sự kiện đều có nút **"Vì sao?"** hiển thị cây quy tắc (`ExplainNode`), tín hiệu kích hoạt, trọng số đóng góp, nguồn sách tham khảo và nhãn độ tin cậy `A` / `B` / `C`.
4. **La bàn 8 Hướng & Công cụ Toàn diện**:
   - La bàn SVG tương tác (hỗ trợ quy ước cổ truyền *Nam trên / Bắc dưới* và bản đồ *Bắc trên / Nam dưới*) với 5 lớp: Tổng hợp, Xuất hành (Hỷ/Tài/Hạc thần), Mệnh quái, Huyền Không Phi Tinh (Năm/Tháng/Ngày/Giờ) và Kỳ Môn Độn Giáp Thời Gia.
   - **Chọn ngày theo 13 mục đích** (quét 7/30/60/90/180 ngày qua Web Worker, hỗ trợ 2 hồ sơ cho Cưới hỏi / Động thổ).
   - **Xem Hợp tuổi / Hợp mệnh 2 hồ sơ** trên 3 lĩnh vực (Tình cảm, Làm ăn, Sống chung).
   - **Gieo quẻ Kinh Dịch (64 quẻ)**: Mai Hoa theo giờ, Gieo 3 đồng xu 6 lần (PRNG có seed), Quẻ trong ngày.
   - **Nhật ký cuối ngày & Thống kê đối chiếu thực tế**, **Từ điển 242 thuật ngữ**, **Chia sẻ thẻ PNG**, **Sao lưu / Khôi phục JSON**.

---

## 2. Yêu cầu hệ thống & Cách chạy ở máy cá nhân

- **Node.js**: `>= 20.x`
- **Cài đặt phụ thuộc**:
  ```bash
  npm install
  ```
- **Chạy máy chủ phát triển (Dev Server)**:
  ```bash
  npm run dev
  ```
- **Kiểm tra dữ liệu & an toàn nội dung (60 sự kiện, từ cấm, chính tả)**:
  ```bash
  npm run lint:data
  ```
- **Chạy toàn bộ Unit Test & Đối chiếu chéo 1900–2100**:
  ```bash
  npm test
  ```
- **Kiểm định Font chữ Tiếng Việt & Chữ Hán**:
  Mở đường dẫn `#/dev/fonts` trên giao diện ứng dụng để xem bảng kiểm tra 134 ký tự dấu tiếng Việt và toàn bộ chữ Hán / Bát quái dùng trong app.
- **Đóng gói bản Production (PWA)**:
  ```bash
  npm run build
  npm run preview
  ```

---

## 3. Triển khai lên GitHub Pages

Dự án đã tích hợp sẵn workflow GitHub Actions tại [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
1. Đẩy mã nguồn lên nhánh `main` (hoặc `master`).
2. Trong phần **Settings → Pages** của kho lưu trữ GitHub, chọn **Source: GitHub Actions**.
3. Workflow sẽ tự động chạy `npm run lint:data`, `npm test`, và `npm run build` với `VITE_BASE=/<tên-repo>/` rồi xuất bản thư mục `dist/` lên GitHub Pages.
4. Nếu muốn đổi tên ứng dụng sau này, chỉ cần sửa hằng số `APP_NAME` trong [`src/constants.ts`](src/constants.ts).

---

## 4. Tuyên bố Miễn trừ trách nhiệm & Quyền riêng tư

- **100% Offline & Riêng tư**: Ứng dụng không có máy chủ backend, không yêu cầu đăng nhập, không thu thập dữ liệu hay gắn bất kỳ mã theo dõi (analytics/telemetry) nào. Toàn bộ hồ sơ ngày sinh, nhật ký và lịch sử gieo quẻ chỉ nằm trong `IndexedDB` và `localStorage` trên thiết bị của người dùng.
- **Miễn trừ trách nhiệm**: Mọi nội dung dự đoán, phân tích Can Chi, Bát Tự, Phong Thủy, Kỳ Môn và Kinh Dịch trong ứng dụng chỉ mang tính chất **tham khảo văn hóa truyền thống, chiêm nghiệm và giải trí**. Ứng dụng không tuyên bố độ chính xác khoa học và tuyệt đối không thay thế cho tư vấn y tế, chẩn đoán bác sĩ, tư vấn tài chính, đầu tư hay pháp lý.
