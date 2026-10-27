# Dữ liệu mẫu bàn giao

vocabulary.seed.json có 10 thẻ minh họa, không phải kho học liệu đầy đủ và chưa được chủ dự án duyệt. JSON dùng camelCase cho trao đổi; importer/seed script map sang snake_case database theo docs/03.

vocabulary.schema.json là JSON Schema cho cấu trúc này. Kiểm tra thêm bằng logic:
- ID card không trùng.
- acceptedAnswers chứa term sau chuẩn hóa.
- Position trong một bộ không trùng.
- reviewStatus=reviewed chỉ khi có reviewer và bằng chứng duyệt.
- Không có ownerId hard-code; khi seed production phải cung cấp SEED_OWNER_ID hợp lệ.

Chuyển các schema tương ứng thành Zod trong implementation; schema JSON này không thay server validation hoặc RLS.

Các ví dụ có contraction, cụm từ và biến thể colour/color để người triển khai không chỉ test từ đơn dễ.
