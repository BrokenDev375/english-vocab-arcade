# Phạm vi học liệu thử nội bộ — 27/10/2026

File `examples/beta-vocabulary.seed.json`: 32 thẻ A1–B1.

SHA-256: `f337e3c3595cd6dc96c503f8b6a1ed1eb9905cc0418a672156f06146532c3190`.

Tập này phục vụ smoke/integration tests và kiểm tra công cụ nạp dữ liệu. Test tự động kiểm tra cấu trúc, ID/vị trí, trường dữ liệu, accepted answers và tính toàn vẹn file. Có trường IPA hoặc dấu `/.../` không chứng minh phiên âm đúng.

Reviewer, trạng thái `reviewed`, nguồn và giấy phép tự khai trong metadata chưa được kiểm chứng độc lập. Báo cáo này không xác nhận 32 thẻ đã được chuyên gia duyệt, không xác nhận độ chính xác ngôn ngữ 100%, không thay thế kiểm tra giấy phép/nguồn.

T18 giữ **UNVERIFIED** cho public beta. Trước phát hành cần:

1. Có >=300 thẻ A1–B1 theo phạm vi kế hoạch.
2. Duyệt nghĩa, từ loại, CEFR, IPA, ví dụ và accepted answers.
3. Có bằng chứng duyệt và nguồn/giấy phép phù hợp; kiểm tra lại nội dung AI.
4. Chạy lại kiểm tra dữ liệu/import và cập nhật manifest theo file thực tế.

Các sửa lỗi kỹ thuật được ghi riêng tại [báo cáo bản sửa](fix-verification-20261027.md).
