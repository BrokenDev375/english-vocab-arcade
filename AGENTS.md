# Quy tắc triển khai dự án

## Phạm vi

- Chỉ viết trong dự án English Vocab Arcade. Repo tiếng Trung và các dự án khác chỉ là nguồn đọc tham khảo.
- Mục tiêu đầu tiên: web A1–B1 hoạt động end-to-end và game gõ từ bắn mục tiêu; nâng cao triển khai sau khi nền tảng đạt nghiệm thu.
- Giao diện tiếng Việt; học tiếng Anh. Không để HSK, pinyin, chineseSentence hoặc zh-CN trong luồng tiếng Anh.
- Thẻ trên Khám phá không hiện tên, username hoặc avatar người tạo. Không query profiles rồi chỉ giấu bằng CSS.
- Không sao chép tên, logo, hình ảnh, âm thanh hoặc mã của Parroto. Chỉ tham khảo cơ chế tương tác công khai và tạo cách trình bày riêng.

## Kỹ thuật

- Next.js App Router, TypeScript strict, React, Tailwind; npm và package-lock.json.
- Node 24.x đồng nhất local/CI/Vercel. P0 xác minh bản Next 16 ổn định hiện có và pin bản cụ thể. Không dùng canary.
- Đọc AGENTS.md do Next sinh và guide trong web/node_modules/next/dist/docs trước khi dùng API framework. Đọc guide chính thức tương ứng nếu package không chứa docs.
- Chạy ESLint trực tiếp, không dùng next lint. Không tắt rule hàng loạt để báo kiểm tra thành công.
- Tách engine game và sinh câu hỏi thành hàm thuần; UI không giữ luật trò chơi rải rác trong JSX.
- Không dùng sort(() => Math.random() - 0.5) để shuffle. Dùng Fisher–Yates, có injectable RNG cho test.
- Không tạo Supabase client mới mỗi render hoặc gây fetch loop do dependency thiếu ổn định.
- Mọi số lượng, điểm, chỉ mục, thời gian, phiên bản nhận từ client phải được validate.
- Phân trang dữ liệu; không giả định query database luôn trả hết trên 1.000 thẻ.
- Server/client boundary rõ; module chứa secret import server-only.

## Bảo mật và dữ liệu

- Database Supabase riêng. Tuyệt đối không chép .env.local, auth token, node_modules, .next hoặc .git từ repo cũ.
- Public env chỉ gồm URL và publishable key. GEMINI_API_KEY và SUPABASE_SECRET_KEY chỉ tồn tại server.
- Kiểm tra danh tính trên server bằng getClaims hoặc getUser theo Supabase SSR guide; không dùng user do client gửi hoặc getSession làm căn cứ duy nhất.
- Tất cả bảng exposed đều có RLS. User B không đọc/ghi được tiến độ, phiên hoặc cache AI của user A.
- Không giữ cache/quota authoritative trong RAM của Vercel Function.
- Mutation đi cùng cookie auth phải kiểm tra Origin, xác thực, phân quyền và schema. Không bật CORS wildcard cho API ghi.
- Không ghi key, toàn bộ request người dùng hoặc email vào log.
- Migration đã áp dụng không sửa ngược; bổ sung migration mới. Không reset database remote có dữ liệu.
- Chỉ dùng quyền server quản trị ở module cần thiết và sau xác thực/phân quyền. Không dùng secret key để né RLS trong CRUD thông thường.
- SQL SECURITY DEFINER phải đặt search_path cố định, dùng tên bảng đầy đủ, revoke EXECUTE mặc định và cấp đúng role. Không tin user_id truyền vào.

## Chất lượng

- Không mặc định mô tả AI tạo là đúng hoặc đã được duyệt học thuật.
- Không gọi điểm khớp transcript là đánh giá chính xác từng âm, ngữ điệu hoặc IELTS speaking.
- Câu dịch tự do được nhiều cách diễn đạt đúng: phân biệt khớp đáp án tham chiếu và phản hồi AI tham khảo.
- Game chạy được khi AI bị tắt; không gọi AI trong tick, keystroke hoặc mỗi lần người dùng trả lời bài đóng.
- Không lặp từ giữa các chặng trong một lượt; từ sai chỉ xuất hiện lại ở lượt ôn lỗi được ghi rõ.
- Không có bảng xếp hạng công khai trong MVP: điểm game client không được quảng bá là chống gian lận.
- Không để UI loading vô hạn; có lỗi, retry và đường quay lại.
- Chạy test cho engine, persistence, RLS và API quan trọng. Đổi màu/chữ đơn giản không cần sinh test hình thức.

## Hoàn thành và bàn giao

- Không thay đổi tài khoản hosting, tạo repository hoặc deploy thật trong lúc chỉ được giao viết kế hoạch.
- Khi đã được giao triển khai, dùng quyền đã được chủ dự án cấp; không hỏi lại cho từng bước đã được cho phép.
- Khi có thiếu quyền từ công cụ/sandbox, nói rõ action và lý do thực tế; không xin xác nhận chung chung.
- Mỗi cổng nghiệm thu có bằng chứng. Mục chưa kiểm tra giữ UNVERIFIED hoặc BLOCKED, không tự gắn DONE.
- Build local, GitHub push, Vercel Ready và smoke test production là bốn bằng chứng khác nhau.
- Đọc và cập nhật tasks/STATUS.md trước khi kết thúc lượt triển khai.
