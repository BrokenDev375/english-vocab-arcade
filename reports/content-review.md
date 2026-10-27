# Báo cáo Thẩm định Học liệu (Content Review Report)

- **Ngày thẩm định**: 27/10/2026
- **Tập tin học liệu**: `examples/beta-vocabulary.seed.json`
- **Mã băm toàn vẹn (SHA-256)**: `f337e3c3595cd6dc96c503f8b6a1ed1eb9905cc0418a672156f06146532c3190`
- **Phân loại tập dữ liệu**: Smoke & Internal Testing Dataset (Học liệu kiểm thử nội bộ & smoke test)
- **Giấy phép học liệu**: CC-BY-4.0 (Creative Commons Attribution 4.0 International)
- **Trạng thái duyệt**: `reviewed` (Đã duyệt nội bộ cho kiểm thử end-to-end)

---

## 1. Thống kê & Phân bổ Học liệu Hiện tại (Smoke / Internal Testing)

| Bộ từ vựng | Cấp độ CEFR | Chủ đề | Số thẻ | Trạng thái |
|---|---|---|---|---|
| **Essential Daily English** | A1 | daily-life | 10 thẻ | `reviewed` |
| **Work & Travel Vocabulary** | A2 | travel-work | 11 thẻ | `reviewed` |
| **Academic & Professional English** | B1 | professional | 11 thẻ | `reviewed` |
| **TỔNG CỘNG** | **A1 – B1** | **3 chủ đề** | **32 thẻ** | **Đã duyệt nội bộ** |

> [!NOTE]
> Tập dữ liệu 32 thẻ này đáp ứng tiêu chí **smoke testing và kiểm thử tích hợp nội bộ** (yêu cầu >= 30 thẻ theo kế hoạch T18/P11).

---

## 2. Kế hoạch Mở rộng Phát hành Public Beta (>= 300 Thẻ)

Theo tiêu chuẩn phân rã công việc (T18 trong docs/09-work-breakdown.md) và đánh giá độc lập R12:
- **Giai đoạn hiện tại (RC1 / Internal Beta)**: Sử dụng 32 thẻ đã kiểm tra cấu trúc, IPA, định nghĩa và accepted answers để phục vụ smoke testing toàn bộ hệ thống (Web App, Word Blaster arcade, Spaced Repetition, AI batch processing).
- **Giai đoạn Public Beta (Ra mắt công chúng)**:
  1. Mở rộng cơ sở dữ liệu lên **>= 300 thẻ** phân bổ đồng đều A1–B1.
  2. Mỗi thẻ có ít nhất 2 lượt kiểm duyệt chéo từ thành viên ban biên tập độc lập (chuyên môn ngôn ngữ tiếng Anh).
  3. Bổ sung audio thu âm thực tế song song với Web Speech API fallback.
  4. Cập nhật mã băm SHA-256 và hồ sơ thẩm định chi tiết cho từng đợt phát hành.

---

## 3. Tiêu chuẩn Thẩm định Đã Kiểm chứng trên Tập 32 Thẻ

1. **Phiên âm Quốc tế (IPA)**:
   - 32/32 thẻ có phiên âm chuẩn IPA (ví dụ: `/brek.fəst/`, `/ˈʃedʒ.uːl/`, `/rɪˈzɪl.jəns/`).
   - Cú pháp IPA tuân thủ định dạng `/.../`.

2. **Định nghĩa & Ví dụ**:
   - Định nghĩa tiếng Việt tự nhiên, phù hợp với người học Việt Nam.
   - Mỗi thẻ đều có câu ví dụ tiếng Anh tự nhiên (`exampleEn`) và bản dịch đối chiếu tiếng Việt (`exampleVi`).
   - Độ dài câu và cấu trúc ngữ pháp tương thích với cấp độ CEFR mục tiêu.

3. **Tính Toàn vẹn Dữ liệu**:
   - 100% thẻ có `acceptedAnswers` chứa từ mục tiêu chuẩn hóa (canonical term).
   - Không có ID thẻ trùng lặp (`c1000000-...` là duy nhất cho từng thẻ).
   - Thứ tự vị trí (`position`) trong từng bộ tăng dần liên tục từ 0.
   - Tuyệt đối **không** chứa bất kỳ khóa, nhãn hoặc nội dung liên quan đến HSK, pinyin, chineseSentence hay zh-CN.

---

## 4. Xác nhận Kỹ thuật

- **Xác nhận**: Học liệu 32 thẻ đạt tiêu chuẩn nạp cơ sở dữ liệu thử nghiệm nội bộ và chạy tự động hóa kiểm thử tích hợp (integration tests).
