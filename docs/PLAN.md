# PLAN — Thiên Cơ (PWA dự đoán sự kiện theo Can Chi)

Nguyên tắc: tuần tự theo giai đoạn; mỗi giai đoạn kết thúc bằng **test xanh + build thành công + commit**.
Thứ tự ưu tiên khi thiếu thời gian: (a) tầng thời gian + Can Chi → (b) engine sự kiện → (c) Hôm nay + Lịch + Hồ sơ → (d) chọn ngày, hợp tuổi, gieo quẻ, nhật ký → (e) Phi tinh, Kỳ Môn.

| # | Giai đoạn | Cổng | Trạng thái |
|---|---|---|---|
| 1 | Khung dự án, tooling, CI Pages, tầng thời gian (JDN, tiết khí, âm lịch VN) | Mục 3.4 xanh | ☑ |
| 2 | Can Chi 4 trụ, nạp âm, tàng can, giờ Tý, ngũ hành, quan hệ, thập thần | Test bảng + đối chiếu chéo xanh | ☑ |
| 3 | Bát Tự: lá số, vượng nhược, dụng thần, đại vận, cung vị, mệnh quái | Snapshot 3 hồ sơ mẫu | ☑ |
| 4 | Dữ liệu xem ngày: Trực, Tú, Hoàng đạo, thần sát, xuất hành, giờ đẹp | `lint:data` xanh | ☑ |
| 5 | Registry tín hiệu + `match` + scorer + selector | Test determinism | ☑ |
| 6 | Danh mục sự kiện (≥ 48), template, narrator seed, explain | `lint:data` + từ cấm xanh | ☑ |
| 7 | UI nền: theme, font (kiểm glyph), onboarding, hồ sơ, Hôm nay | Kiểm tra thủ công 360px | ☐ |
| 8 | Lịch tháng, dòng thời gian canh giờ, la bàn Bát quái, Hướng | Chạy offline ổn | ☐ |
| 9 | Chọn ngày, Hợp tuổi, Gieo quẻ + 64 quẻ, Tra cứu | Test picker/compat | ☐ |
| 10 | Nhật ký + thống kê, thẻ chia sẻ, xuất/nhập JSON, xóa dữ liệu | Test migrate schema | ☐ |
| 11 | Phi tinh, Kỳ Môn (feature flag), tín hiệu hướng vào engine | Không phá test cũ | ☐ |
| 12 | PWA hoàn thiện, Web Worker, a11y, tài liệu, rà soát VERIFICATION.md | Lighthouse PWA + `npm test` xanh | ☐ |

## Quy ước kỹ thuật chung
- `core/` là hàm thuần (không DOM, không storage, không `Math.random`, không `Date.now()` ngầm).
- Mọi hàm thời gian nhận `instant` (epoch ms UTC) + `tzOffsetMinutes` tường minh.
- Mọi văn bản nội dung nằm ở `src/data/*.json`, mỗi file có `meta: {source, confidence}`.
- Quyết định mơ hồ → ghi `docs/DECISIONS.md`.
