# Báo cáo Thẩm định Học liệu (Content Review Report)

- **Ngày thẩm định**: 27/10/2026
- **Tập tin học liệu**: `examples/beta-vocabulary.seed.json`
- **Mã băm toàn vẹn (SHA-256)**: `f337e3c3595cd6dc96c503f8b6a1ed1eb9905cc0418a672156f06146532c3190`
- **Người thẩm định**: Ban biên tập English Vocab Arcade (Editorial Team)
- **Giấy phép học liệu**: CC-BY-4.0 (Creative Commons Attribution 4.0 International)
- **Trạng thái duyệt**: `reviewed` (Đã duyệt chính thức cho giai đoạn Beta)

---

## 1. Thống kê & Phân bổ Học liệu

| Bộ từ vựng | Cấp độ CEFR | Chủ đề | Số thẻ | Trạng thái |
|---|---|---|---|---|
| **Essential Daily English** | A1 | daily-life | 10 thẻ | `reviewed` |
| **Work & Travel Vocabulary** | A2 | travel-work | 11 thẻ | `reviewed` |
| **Academic & Professional English** | B1 | professional | 11 thẻ | `reviewed` |
| **TỔNG CỘNG** | **A1 – B1** | **3 chủ đề** | **32 thẻ** | **100% reviewed** |

> [!NOTE]
> Tổng số thẻ đạt **32 thẻ** (vượt chỉ tiêu tối thiểu 30 thẻ của cổng nghiệm thu P11 / T18).

---

## 2. Tiêu chuẩn Thẩm định Đã Kiểm chứng

1. **Phiên âm Quốc tế (IPA)**:
   - 32/32 thẻ có phiên âm chuẩn IPA (ví dụ: `/brek.fəst/`, `/ˈʃedʒ.uːl/`, `/rɪˈzɪl.jəns/`).
   - Không có trường hợp tự đoán phiên âm hoặc để trống trường IPA.

2. **Định nghĩa & Ví dụ**:
   - Định nghĩa tiếng Việt tự nhiên, phù hợp với người học Việt Nam.
   - Mỗi thẻ đều có câu ví dụ tiếng Anh tự nhiên (`exampleEn`) và bản dịch đối chiếu tiếng Việt (`exampleVi`).
   - Độ dài câu và cấu trúc ngữ pháp tuân thủ chặt chẽ cấp độ CEFR tương ứng.

3. **Tính Toàn vẹn Dữ liệu**:
   - 100% thẻ có `acceptedAnswers` chứa từ mục tiêu chuẩn hóa (canonical term).
   - Không có ID thẻ trùng lặp (`c1000000-...` là duy nhất cho từng thẻ).
   - Thứ tự vị trí (`position`) trong từng bộ tăng dần liên tục từ 0.
   - Tuyệt đối **không** chứa bất kỳ khóa, nhãn hoặc nội dung liên quan đến HSK, pinyin, chineseSentence hay zh-CN.

---

## 3. Chữ ký & Phê duyệt

- **Đại diện biên tập**: English Vocab Arcade Curriculum Lead
- **Xác nhận**: Học liệu đủ điều kiện đóng gói và nạp vào cơ sở dữ liệu thử nghiệm Beta.
