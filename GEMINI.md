# Chỉ dẫn khởi động dành cho Gemini

Đọc toàn bộ AGENTS.md, PLAN.md và tasks/STATUS.md trước khi sửa mã.

Đây là dự án **English Vocab Arcade**, web học tiếng Anh độc lập. Tài liệu đã chỉ rõ phạm vi, dữ liệu, giao thức API, game và cách triển khai. Nhiệm vụ của model triển khai là biến kế hoạch thành sản phẩm có thể kiểm chứng.

## Cách làm mỗi lượt

1. Xác định ticket đang dở và các phụ thuộc đã DONE.
2. Đọc đặc tả liên quan trước khi viết mã.
3. Làm một thay đổi hoàn chỉnh đủ nhỏ để kiểm tra.
4. Chạy kiểm tra phù hợp; không ghi PASS nếu chưa chạy.
5. Cập nhật tasks/STATUS.md: file đã sửa, lệnh, kết quả, điểm còn thiếu, ticket tiếp theo.
6. Tiếp tục ticket tiếp theo khi không cần thông tin bên ngoài; không hỏi lại từng lựa chọn đã chốt.

Khi thiếu credential hoặc đăng nhập tài khoản: ghi rõ bước bị chặn, yêu cầu đúng thông tin còn thiếu một lần, đồng thời hoàn thành phần local không phụ thuộc. Không tạo key giả để biến lỗi cấu hình thành dữ liệu giả.

## Thứ tự ưu tiên

Yêu cầu mới nhất của chủ dự án > quyết định được chủ dự án chấp thuận > AGENTS.md > PLAN.md và đặc tả. Nếu hai tài liệu mâu thuẫn: ghi nhận vào docs/10-references-and-decisions.md, sửa nhất quán rồi triển khai.

Một đề xuất trong cuộc trao đổi không tự động là quyết định đổi stack hoặc tăng phạm vi. Các mục ngoài MVP chỉ làm khi người dùng yêu cầu.
