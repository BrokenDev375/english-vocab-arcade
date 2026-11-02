# Giao diện và luồng học gần Quizlet clone gốc — 02/11/2026

Yêu cầu chủ dự án: giữ bố cục và thao tác quen thuộc của repo tiếng Trung, chuyển nội dung sang tiếng Anh A1–B1 và bổ sung Word Blaster. Repo gốc chỉ được đọc tham khảo, không bị sửa trong lượt này. Source nền tiếng Anh: `053982f8b77349e6e749475df4bdc76a747146bb`.

## Kết quả triển khai

- Header indigo/blue có tìm kiếm, tạo học phần, thư viện và menu mobile. Logout vẫn chờ queue lưu tiến độ; dữ liệu tài khoản được phân lập như trước.
- Trang chủ đặt học phần và flashcards làm nội dung chính; Word Blaster là chế độ bổ sung. Bỏ các câu quảng bá kỹ thuật RLS hoặc tuyên bố học liệu đã được chuyên gia duyệt khỏi giao diện mới.
- Khám phá và thư viện dùng tìm kiếm/lọc/phân trang server, không cắt danh sách ở 50 bộ. Giữ nguyên việc không query hoặc hiển thị profile người tạo. Sắp xếp có thêm ID để phân trang ổn định khi cùng thời gian tạo.
- Trang học phần có header, điều khiển chủ sở hữu, banner tiếp tục, lưới chế độ học, thẻ lật trực tiếp và danh sách thuật ngữ kèm phát âm. Thẻ lật dùng cùng `FlashcardViewer` và `useStudySession`, giữ tương thích route flashcards riêng và tiến độ cũ.
- Hội thoại tiếng Anh A/B có nghe từng câu, bật/tắt bản dịch, nhập giọng nói qua Web Speech hoặc bàn phím, đổi vai, khôi phục sau reload và hoàn thành phiên. Kết quả thể hiện mức khớp câu tham khảo, không quảng cáo là chấm phát âm từng âm.
- AI Hội thoại dùng cùng adapter Gemini, timeout, cache bền vững, quota và ngân sách provider hiện có. Validate vai luân phiên, ID từ đúng bộ và đủ coverage. Server chấm câu theo batch của đúng user/set/turn; không dùng đáp án hoặc điểm do client tự khai làm căn cứ.
- Migration 0007 chỉ mở rộng CHECK của sessions và AI cache. Không đổi migrations đã áp dụng, không reset và không xóa dữ liệu.

## Kiểm tra local

- ESLint với max-warnings 0: PASS.
- TypeScript strict: PASS.
- Unit: 119/119, 17 files PASS, gồm ID bịa, coverage thiếu, khai báo ID trùng, vai hội thoại sai.
- Production build: PASS, 44 trang ở bước prerender và route Hội thoại được tạo.
- Edge headless: 6 ảnh/kiểm tra trang chủ, học phần, Hội thoại ở 1440 px và 360 px; không overflow, không pageerror. Ca thứ bảy trả lời Hội thoại mẫu rồi reload vẫn giữ kết quả: PASS. Các ca này dùng guest auth mock và dữ liệu demo, không chứng minh RLS hoặc đăng nhập thật.
- Đã thêm 3 integration tests cho cache hit, câu đầy đủ so với từ đơn, phân lập cache, turn sai và resume; thêm 5 E2E cho tìm kiếm/phân trang, thẻ lật trong hub, Hội thoại/đổi vai, nút owner và mobile search.
- CI đầu tiên [41421248272](https://github.com/BrokenDev375/english-vocab-arcade/actions/runs/41421248272) trên `ecd179f`: integration/build PASS, 19/20 E2E PASS. Ca tìm kiếm đếm cả headings của trang Thư viện được Next giữ ẩn sau điều hướng. Đã tái hiện local với auth/API mock: DOM tổng 24, headings accessible 12; chuyển trang còn 1, lọc B1 về rỗng đều đúng. Sửa selector theo role để chỉ kiểm tra trang hiện tại; full CI sau sửa cần xác nhận.
- Không gọi Gemini thật và không viết dữ liệu production trong lượt kiểm tra local.

## Docker/WSL trên máy chủ dự án

Docker Desktop báo lỗi bootstrap WSL `0xc00000fd` khi khởi động. Kiểm tra sau đó từng xác nhận WSL docker-desktop Running và Docker Engine 29.4.0 phản hồi, nhiều container bắt đầu chạy. Chủ máy xác nhận đã đóng Docker khi engine mất kết nối tiếp theo; vì vậy chưa kết luận crash tự lặp lại. Giữ Docker đóng theo trao đổi, không reset/unregister distro, không xóa volumes hoặc đổi cấu hình WSL. Full DB tests chuyển sang CI Linux.

## Triển khai

- Vercel/Supabase nền đã kiểm tra 30/10/2026: health 200 build 053982f, sets explore 200, auth/user 200; chủ dự án đã chạy bộ SQL sáu migrations.
- Hội thoại production cần chạy lại **toàn bộ** [bộ SQL gộp cập nhật](../supabase/manual/english-vocab-arcade.sql) trong SQL Editor của project tiếng Anh. File bỏ qua prefix sáu migrations đã có lịch sử, áp dụng 0007 và ghi history. Kết quả mong đợi `applied_migrations = 7`.
- Các chế độ cũ không cần chuyển dữ liệu; bản Hội thoại báo chưa được bật nếu database chưa nhận 0007.
- `ecd179f8a81cce6051613ed62a7a661c8856f5ed` đã push main, Vercel [deployment Ready](https://vercel.com/thanh-djts-projects/english-vocab-arcade/Gdxboxyz8nfJfcZrv1WEzhuwKsrY); health trả 200 đúng SHA, sets explore 200, auth/user 200. Chạy lại 7 kiểm tra trình duyệt trực tiếp trên website thật với guest auth thật: PASS, không pageerror/overflow; chỉ dùng bài demo và lưu trình duyệt.
- Provider Gemini thật/micro thật chưa được xác minh; học liệu public beta và duyệt ngôn ngữ độc lập vẫn theo trạng thái cũ.
