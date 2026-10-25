# DECISIONS — quyết định tự chọn khi đặc tả mơ hồ

Mỗi mục: vấn đề → lựa chọn → lý do.

## D1. Biểu diễn thời gian
- **Vấn đề:** hồ sơ có `birth.tz`; kiểu dữ liệu chưa chốt.
- **Chọn:** `birth.datetime` là chuỗi giờ treo tường `YYYY-MM-DDTHH:mm`; `birth.tz` là **offset phút so với UTC** (mặc định 420). Mọi hàm core nhận `instant` (epoch ms UTC) + `tzOffsetMinutes`.
- **Lý do:** tránh phụ thuộc IANA tz database và dữ liệu lịch sử múi giờ (miền Nam VN từng dùng UTC+8); người dùng có thể chỉnh offset cho ngày sinh cũ.

## D2. Thuật toán thiên văn (tự cài, không dùng thư viện lúc chạy)
- **Tiết khí:** kinh độ biểu kiến Mặt Trời theo VSOP87D Trái Đất (rút gọn: L0 64 số hạng, L1 34, L2 20, L3 7, L4 3, L5 1; Meeus Phụ lục III) + chương động (Δψ 4 số hạng) + quang sai − hiệu chỉnh FK5; ΔT theo Espenak & Meeus. Giải ngược bằng Newton. Đối chiếu `lunar-javascript` 1900-2100: lệch tối đa ~38 giây.
- **Sóc (Trăng mới):** Meeus ch. 49 (25 số hạng chu kỳ + 14 hiệu chỉnh hành tinh), chuyển UT bằng ΔT.
- **Lý do:** đạt yêu cầu "sai số vài phút" với dư địa lớn; không phụ thuộc thư viện.

## D3. Âm lịch Việt Nam luôn dùng UTC+7
- Bảng tháng âm được dựng theo `tzMin` truyền vào (mặc định 420 cho Việt Nam). Không dùng UTC+8 nhiều giai đoạn lịch sử như một số nguồn; theo quy ước của Hồ Ngọc Đức: UTC+7 cho mọi năm.
- Tháng nhuận: tháng đầu tiên không có trung khí trong năm có 13 tháng giữa hai tháng chứa Đông Chí. (Tháng 11 là tháng chứa Đông Chí.)

## D4. Giờ Tý
- Mặc định `day_changes_at_23`; có `day_changes_at_00`.
- **Chi tiết mơ hồ:** với quy ước `day_changes_at_00`, giờ Tý muộn (23h-24h) giữ Can Chi ngày của hôm đó, và Can giờ được suy từ **chính Can ngày đó** (đúng chữ của đặc tả: "Can giờ theo Ngũ Thử độn từ Can ngày đã tính theo quy ước"). Một số trường phái (và `lunar-javascript` sect 2) lấy Can giờ theo Can ngày hôm sau; ta **không** theo, đã ghi trong VERIFICATION.md. Hai quy ước trùng nhau ở mọi giờ khác 23h.

## D5. Giờ mặt trời thực (kinh độ)
- **Không áp dụng** ở bản này (đúng đặc tả). Hạn chế: người sinh sát ranh giới canh giờ có thể lệch một canh nếu dùng giờ mặt trời thực.

## D6. Mô hình Fact → Signal
- Engine dựng bảng fact (`key → values[]`); mỗi cặp tạo một Signal `id = key.value`. `match` và `weights` của sự kiện chỉ tham chiếu fact/signal id. Chi tiết: `docs/RULES_SCHEMA.md`.
- Lý do: thêm sự kiện/quy tắc chỉ cần sửa JSON.

## D7. Mệnh quái và `gender = khong_neu`
- Hiển thị cả hai (cách tính nam và nữ) và nói rõ; engine mặc định dùng cách tính **nam** cho tín hiệu hướng cho tới khi người dùng chọn.
