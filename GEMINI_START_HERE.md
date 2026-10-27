# Prompt giao dự án cho Gemini

Copy nội dung trong khối dưới đây vào model triển khai sau khi mở đúng thư mục.

~~~text
Bạn triển khai dự án tại:
D:\Study\personal project\english-vocab-arcade

Đọc GEMINI.md, AGENTS.md, PLAN.md, tasks/STATUS.md và đặc tả của giai đoạn tương ứng.
Đây là dự án mới, không sửa các dự án học tiếng Anh/IELTS khác và không sửa website tiếng Trung.

Mục tiêu: xây web học tiếng Anh cho người Việt, có Supabase Auth/database, flashcard, Learn/Test, ghép cặp theo chặng, game gõ từ bắn mục tiêu, nội dung AI được lưu và deploy lên Vercel. Hai chế độ arcade phải có: thấy từ để gõ và thấy nghĩa để nhớ từ.

Hãy bắt đầu P0. Ứng dụng nằm trong web/, không tạo Next.js vào root chứa tài liệu. Đi theo ticket trong docs/09-work-breakdown.md, chỉ nhận DONE khi đạt tiêu chí nghiệm thu và có bằng chứng.

Không tự tăng phạm vi thành mạng xã hội, luyện thi IELTS hoàn chỉnh, app native hoặc game multiplayer. Không bỏ qua backend bằng dữ liệu giả. Không tắt RLS, không đưa secret vào NEXT_PUBLIC_, không dùng model ID tự đoán.

Nếu thiếu credential, tài khoản hoặc quyền deploy: liệt kê chính xác bước và thông tin còn thiếu; tiếp tục các phần local độc lập. Không nhờ tôi xác nhận lại các lựa chọn kỹ thuật đã được plan chốt.

Sau mỗi giai đoạn, cập nhật tasks/STATUS.md và báo: đã xong gì, chạy kiểm tra nào, bằng chứng, phần còn thiếu, ticket tiếp theo.
Triển khai đến khi các cổng nghiệm thu hoàn thành hoặc chỉ còn việc bắt buộc chủ tài khoản phải làm. Không tuyên bố website đã lên chỉ vì push thành công.
~~~

## Khi tiếp tục một phiên đã dở

~~~text
Tiếp tục dự án English Vocab Arcade. Đọc tasks/STATUS.md trước, xác minh trạng thái thực tế, rồi tiếp tục ticket có ưu tiên cao nhất chưa hoàn thành. Không dựng lại từ đầu hoặc ghi đè tài liệu. Các mục trước đây chỉ là mock/demo phải được phân biệt với tích hợp thật.
~~~

## Thông tin chủ tài khoản sẽ cần cung cấp khi triển khai

Chỉ thu thập khi tới bước cần dùng; không gửi secret trong commit hoặc báo cáo công khai.

- Tên GitHub repository mới và quyền push.
- Vercel team/project mới; domain nếu có. URL chưa có để TBD.
- Supabase project tiếng Anh mới: project ref, URL, publishable key; quyền migration; server secret qua env an toàn.
- Xác nhận còn suất Supabase Free hoặc gói dự định dùng.
- Gemini API key server-side và model khả dụng thực tế trong project.
- Email test A/B, cấu hình xác minh email/SMTP khi cần phát hành.
- Quyết định dùng public hay private repository. Mặc định chưa tạo repo cho tới khi có thông tin này.
