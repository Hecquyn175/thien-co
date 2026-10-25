# RULES_SCHEMA — thêm sự kiện / quy tắc / trọng số mà không sửa code

Toàn bộ nội dung dự đoán nằm trong `src/data/`. Engine chỉ đọc JSON.

## 1. Mô hình: Fact → Signal → Sự kiện

Mỗi thời điểm (ngày + giờ + tháng/năm lưu) + lá số sinh ra một bảng **fact**:

```
facts: Record<string /* key */, string[] /* các giá trị */>
```

Mỗi cặp `key=value` trong fact tạo ra một **Signal** với `id = "<key>.<value>"`
(vd fact `ten_god.day_stem = thien_tai` → signal `ten_god.day_stem.thien_tai`).
Signal có `strength` (0..1), `valence` (-1..+1, đã xét dụng/kỵ thần), `palace?`, `window?`, `direction?`, `tags`, `explain`.

### Quy ước "slot" thời gian trong key
Key chứa đúng một trong các slot: `day`, `hour`, `month`, `year`
(ngày xem, canh giờ xem, lưu nguyệt, lưu niên). Hệ số mặc định: day 1.0, hour 0.7, month 0.4, year 0.25.
(`luck_cycle.*` = đại vận, hệ số 0.3.)

## 2. Danh mục fact (key → giá trị hợp lệ)

Giá trị luôn là chuỗi `snake_case` không dấu.

| Key | Giá trị |
|---|---|
| `ten_god.day_stem`, `ten_god.hour_stem`, `ten_god.month_stem`, `ten_god.year_stem` | `ty_kien` `kiep_tai` `thuc_than` `thuong_quan` `thien_tai` `chinh_tai` `that_sat` `chinh_quan` `thien_an` `chinh_an` (thập thần của Can so với Nhật chủ) |
| `ten_god.day_branch`, `ten_god.hour_branch`, `ten_god.month_branch`, `ten_god.year_branch` | cùng tập thập thần, **nhiều giá trị** (bản khí, trung khí, dư khí của Chi tàng can) |
| `ten_god.luck_stem`, `ten_god.luck_branch` | thập thần của đại vận |
| `branch_relation.day_branch`, `.hour_branch`, `.month_branch`, `.year_branch` | `<quan_he>_<cung>`; quan hệ ∈ `xung` `luc_hop` `tam_hop` `ban_tam_hop` `hinh` `hai` `pha`; cung ∈ `nhat_chi` `nguyet_chi` `nien_chi` `gio_chi`. Vd `xung_nhat_chi`, `luc_hop_nguyet_chi`. Nhiều giá trị. |
| `stem_relation.day_stem`, `.hour_stem`, `.month_stem`, `.year_stem` | `hop_nhat_chu` `xung_nhat_chu` `hop_nien_can` `hop_nguyet_can` `hop_gio_can` |
| `useful_god.day_element`, `.hour_element`, `.month_element`, `.year_element` | `dung` (dụng/hỷ thần) `ky` (kỵ/cừu thần) `trung_tinh` |
| `luck_cycle.dai_van` , `luck_cycle.luu_nien`, `luck_cycle.luu_nguyet` | `dung` `ky` `trung_tinh` |
| `almanac.hoang_dao` | `hoang_dao` `hac_dao` |
| `almanac.hour_hoang_dao` | `hoang_dao` `hac_dao` (canh giờ đang xét) |
| `almanac.truc` | `kien` `tru` `man` `binh` `dinh` `chap` `pha` `nguy` `thanh` `thu` `khai` `be` |
| `almanac.tu28_rating` | `cat` `binh` `hung` |
| `than_sat` | tập id thần sát có trong ngày: `thien_duc` `nguyet_duc` `thien_hy` `thien_quan` `thien_phu` `thien_tai` `thien_y` `sinh_khi` `dich_ma` `thanh_long` `minh_duong` `kim_quy` `bao_quang` `ngoc_duong` `tu_menh` `sat_chu` `tho_tu` `tam_nuong` `nguyet_ky` `duong_cong_ky` `nguyet_pha` `ha_khoi` `cau_giao` `thien_hinh` `chu_tuoc` `bach_ho` `thien_lao` `nguyen_vu` `cau_tran` … (danh mục chính thức: `src/data/than-sat.json`) |
| `flying_star.day_star`, `flying_star.year_star`, `flying_star.month_star`, `flying_star.hour_star` | `1`..`9` (sao trung cung) |
| `qimen.hour_doors` | tập môn cát/hung có mặt ở cung tốt cho người xem: `huu_mon` `sinh_mon` `thuong_mon` `do_mon` `canh_mon` `tu_mon` `kinh_mon` `khai_mon` |
| `qimen.hour_overall` | `cat` `binh` `hung` |
| `iching.day_hexagram_nature` | `cat` `binh` `hung` |

Nếu cần fact mới: thêm nguồn tín hiệu vào `src/core/events/signals.ts` (registry) rồi liệt kê ở bảng trên.

## 3. Schema sự kiện (`src/data/events/<nhom>.json`)

```jsonc
{
  "meta": { "source": "...", "confidence": "B" },
  "events": [
    {
      "id": "tien_bac.thu_ngoai_du_kien",        // "<nhom>.<ten>", duy nhất toàn cục
      "group": "tien_bac",                       // nguoi | tien_bac | cong_viec | suc_khoe_di_chuyen
      "title": "Khoản thu ngoài dự kiến",
      "baseWeight": 1.0,
      "match": {                                  // bộ đánh giá điều kiện (xem §4)
        "all":  [{ "signal": "ten_god.day_stem", "in": ["thien_tai", "chinh_tai"] }],
        "any":  [{ "signal": "useful_god.day_element", "is": "dung" }],
        "none": [{ "signal": "branch_relation.day_branch", "is": "xung_nhat_chi" }]
      },
      "weights": { "ten_god.day_stem.thien_tai": 3, "than_sat.thien_duc": 0.5 },
      "polarityRule": "net_valence",              // net_valence | fixed:thuan | fixed:nghich | fixed:trung_tinh
      "situations": ["...", "...", "..."],        // >= 3 biến thể, tự viết
      "advice": { "use": ["..", ".."], "avoid": ["..", ".."], "remedy": ["..", ".."] }, // mỗi loại >= 2
      "conflictsWith": [                          // tuỳ chọn: quy tắc giảm nhẹ / ưu tiên
        { "id": "tien_bac.chi_tieu_phat_sinh", "mode": "dampen", "factor": 0.6 }
      ],
      "ref": { "palaceHint": "ban_than", "directionHint": "tai_than" },
      "source": "Ánh xạ thập thần phổ thông (Thiên Tài → tiền ngoài dự kiến); văn bản tự viết",
      "confidence": "B"
    }
  ]
}
```

- `weights`: key là **signal id** (`<key>.<value>`); trọng số ≥ 0 (có thể âm để triệt tiêu).
- `score = baseWeight × Σ(weight_i × strength_i × hệ số slot) × hệ số giờ-sinh-không-rõ`.
- Sự kiện chỉ được chọn khi `match` đúng **và** có ít nhất một signal trong `weights` được kích hoạt.
- `conflictsWith.mode`: `dampen` (nhân điểm sự kiện **này** với `factor` nếu sự kiện kia đang được chọn với điểm cao hơn) hoặc `suppress` (loại bỏ sự kiện thấp điểm hơn). Cả hai mặt được nêu trong lời nhắn.
- `palaceHint` ∈ `ban_than` `phoi_ngau` `su_nghiep_cha_me` `goc_moi_truong` `con_cai_cap_duoi`; `directionHint` ∈ `hy_than` `tai_than` `hac_than`.

## 4. Bộ đánh giá `match`

- `{ "signal": "<key>", "is": "<value>" }` — đúng nếu fact `<key>` chứa `<value>`.
- `{ "signal": "<key>", "in": ["a","b"] }` — đúng nếu fact `<key>` chứa ít nhất một giá trị trong danh sách.
- `{ "signal": "<key>", "notIn": [...] }` — đúng nếu fact `<key>` không chứa giá trị nào trong danh sách (fact vắng mặt cũng đúng).
- `all`: mọi điều kiện đúng. `any`: nếu không rỗng thì ≥ 1 điều kiện đúng. `none`: không điều kiện nào đúng.
- Điều kiện lồng nhau: phần tử của `all/any/none` có thể là `{ "all": [...] }`, `{ "any": [...] }`, `{ "none": [...] }`.

## 5. Quy tắc nội dung (lint:data sẽ kiểm)

- Giọng "dễ", "có xu hướng", "nên cân nhắc". Không phán chắc chắn, không hù dọa.
- Cấm: bệnh cụ thể, tử vong, tai nạn nghiêm trọng, ly hôn, phá sản (danh sách trong `scripts/lint-data.ts`).
- Nhóm `suc_khoe_di_chuyen`: mọi sự kiện có câu "Nếu thấy không khỏe, hãy hỏi ý kiến bác sĩ" trong ít nhất một mục `advice`.
- Tài chính: chỉ lời khuyên thói quen chung; không khuyên mua/bán/đầu tư/vay cụ thể. Pháp lý: nhắc tham khảo chuyên gia.
- Nói về người khác ở mức vai trò ("một người bạn", "cấp trên").
- Sự kiện nghịch phải có `remedy` khả thi; sự kiện thuận có `use` để tận dụng.

## 6. Template (`src/data/templates/*.json`)

Khung câu cho narrator: `overview.json` (tổng quan theo nhãn điểm), `group_intro.json`, `time_window.json`, `balance.json` (nêu cả hai mặt khi có mâu thuẫn), `daily_note.json`. Mỗi file là `{ "meta": {...}, "variants": { "<khoá>": ["câu 1", "câu 2", ...] } }`; chỗ trống dùng `{ten_bien}`.
