# 01 — Sản phẩm, nội dung và trải nghiệm

## 1. Người dùng và mục tiêu

Người Việt trình độ A1–B1 muốn nhớ từ và dùng được từ trong câu ngắn. Bản beta ưu tiên học đều mỗi ngày, phản hồi rõ và giải trí bằng game. Giao diện không dùng thuật ngữ kỹ thuật như cache key, RPC hoặc provider retry trong luồng học.

Luồng chính:
Khám phá → chọn học phần → xem từ → chọn chế độ → học/chơi → xem lỗi → tiếp tục tiến độ đã lưu.

## 2. Vai trò

| Vai trò | Quyền |
|---|---|
| Khách | Xem bộ public, thử game/học public với tiến độ chỉ trong tab, nhận nhắc đăng nhập để đồng bộ |
| Thành viên | Tạo bộ, nhập thẻ, học bộ được phép xem, lưu tiến độ và yêu cầu AI trong quota |
| Chủ bộ | Sửa/xóa/chuyển public bộ của mình; không xem tiến độ của người khác |
| Người vận hành | Chạy migration/seed qua công cụ server; không có admin panel công khai trong beta |

Không có trang tra cứu profile cộng đồng ở bản đầu. Hiển thị tên của chính người dùng trong tài khoản là được; không đưa tên tác giả lên thẻ Khám phá.

## 3. Cấu trúc màn hình

| Route | Nội dung và hành động |
|---|---|
| / | Giới thiệu ngắn, thử game, khám phá, đăng nhập |
| /explore | Bộ public, search title, lọc level/chủ đề, phân trang |
| /login, /signup | Email/password, trạng thái xác minh |
| /forgot-password, /reset-password | Yêu cầu email và đặt mật khẩu mới |
| /auth/confirm | Xác minh email theo Auth flow thực tế |
| /auth/callback | Đổi code lấy session khi flow sử dụng PKCE |
| /dashboard | Bộ của tôi, bộ gần học và tiến độ cá nhân |
| /sets/new, /sets/[id]/edit | Tạo/sửa thông tin bộ, thẻ, preview import |
| /sets/[id] | Tóm tắt, danh sách thẻ, chọn chế độ, tiếp tục phiên |
| /sets/[id]/flashcards | Lật thẻ, audio, đánh dấu mức nhớ |
| /sets/[id]/learn | Nhóm ôn thích ứng và lượt ôn lỗi |
| /sets/[id]/test | Chọn dạng/số câu, làm bài, kết quả và lỗi |
| /sets/[id]/match | Tối đa 6 cặp/chặng, đi hết bộ mới lặp |
| /sets/[id]/arcade | Chọn typing/recall, hướng dẫn, game, kết quả |
| /sets/[id]/dictation | Nghe từ/câu ngắn và gõ lại |
| /sets/[id]/speak | Nghe mẫu, ghi nhận transcript, phản hồi mức khớp |
| /sets/[id]/grammar | Sắp xếp từ thành câu, gợi ý và giải thích |
| /sets/[id]/reading | Bài đọc ngắn và câu hỏi đóng |
| /sets/[id]/translate | Dịch câu Việt → Anh, đáp án tham chiếu |
| /review | Các từ đến hạn và từ sai |
| /settings | Múi giờ, giọng đọc mặc định, tắt âm, quản lý tài khoản cơ bản |

Mỗi route bất đồng bộ phải có loading/empty/error/success. Private set không tồn tại với người không có quyền: dùng trang không tìm thấy, không trả metadata riêng tư.

## 4. Mô hình thẻ cho người học

Một thẻ = một từ/cụm từ + một nghĩa chính + từ loại + ngữ cảnh rõ.

Ví dụ:
- term: brave
- part_of_speech: adjective
- meaning_vi: dũng cảm
- ipa: /breɪv/
- cefr_level: A2
- example_en: The brave girl helped the lost child.
- example_vi: Cô bé dũng cảm đã giúp đứa trẻ bị lạc.
- accepted_answers: brave

IPA được nhập/duyệt từ nguồn phù hợp; không tự sinh bằng pinyin-pro. Level trong nội dung mẫu là ước lượng biên tập, không là xác nhận chứng chỉ.

Hỗ trợ:
- Từ đơn, cụm từ có khoảng trắng, gạch nối và dấu nháy.
- Khác biệt Anh–Mỹ được khai báo vào accepted_answers: color/colour.
- Hai nghĩa của cùng từ là hai thẻ riêng; chọn câu hỏi phải tránh đáp án mơ hồ.
- Không chấp nhận thông tin dài vô hạn: term 1–80 ký tự, nghĩa 1–300, ví dụ mỗi ngôn ngữ tối đa 500, IPA tối đa 120.
- Game chỉ nhận đáp án ASCII tiếng Anh dạng chữ, khoảng trắng, nháy và gạch nối, dài tối đa 40; thẻ không phù hợp vẫn học ở chế độ khác.

## 5. Các chế độ cơ bản

### Flashcard

Mặt trước tiếng Anh; mặt sau nghĩa, IPA, từ loại và ví dụ. Có tùy chọn đảo hướng học, nghe và điều hướng bàn phím. Không tự đọc audio khi tải trang; audio bắt đầu sau tương tác người dùng.

### Learn

Chọn tối đa 6 thẻ chưa vững/đến hạn mỗi nhóm; mỗi thẻ xuất hiện một câu hỏi ở lượt chính. Sau lượt chính, sai được đưa vào lượt ôn lỗi có nhãn. Không gọi việc lặp có chủ đích là lỗi shuffle.

Kiểu câu hỏi: English → nghĩa, nghĩa → English, gõ từ, điền từ trong ví dụ. Lựa chọn sai phải khác nhau sau chuẩn hóa, không lấy hai nghĩa cùng đúng làm distractor.

Với quá ít thẻ hoặc distractor hợp lệ: giảm số lựa chọn hoặc đổi sang gõ từ, không nhân bản đáp án để đủ bốn ô.

### Test

Số câu tối đa bằng số tổ hợp card/type hợp lệ. Không tạo hai câu trùng card/type trong cùng bài. Kết quả hiển thị câu hỏi, câu trả lời, đáp án và giải thích. Không hiện đáp án trước khi nộp trong UI; đây là bài luyện, không tự nhận là hệ thống thi chống gian lận.

### Match

Tối đa 6 cặp/chặng. Xáo trộn một lần toàn bộ ID ở đầu lượt, lấy lần lượt từng đoạn. Chặng cuối dùng phần dư. Timer chỉ tính khi chơi, nghỉ giữa chặng không cộng. Hoàn thành bộ mới có nút chơi lại.

Hai thẻ có cùng chữ hoặc cùng nghĩa không được làm cặp bắt buộc gây hiểu nhầm trong cùng bảng. Tách chúng sang chặng phù hợp hoặc cho phép ghép nội dung tương đương theo quy tắc đã test; ưu tiên tách, không silently xóa thẻ.

### Ôn tập đến hạn

Lịch đơn giản, có thể kiểm tra:
- Trả lời đúng tăng correct_streak.
- Khoảng cách theo streak: 10 phút, 1 ngày, 3 ngày, 7 ngày, 14 ngày, 30 ngày; vượt mức cuối giữ 30 ngày.
- Sai đặt streak về 0 và due_at = thời gian server + 10 phút.
- Chỉ event trả lời thực mới cập nhật lịch; mở/lật thẻ không giả định người dùng đã nhớ.
- Đánh dấu tự đánh giá từ flashcard được lưu riêng với answer attempt để không cộng lẫn điểm kiểm tra.

## 6. Thiết kế giao diện

Phong cách riêng: nền sáng hoặc tối dễ đọc, màu xanh navy/teal, điểm nhấn amber cho hành động trong game. Dùng icon và vector do dự án tạo; có chế độ giảm chuyển động.

Các yêu cầu:
- Layout dùng được ở 360 px, 768 px và 1440 px.
- Text không bị cắt mất nghĩa ở game và bài học; cho xem toàn bộ prompt.
- Nút thao tác chính đủ lớn cho cảm ứng; không dựa hoàn toàn vào hover.
- Focus nhìn thấy, label cho input, hỗ trợ bàn phím và thông báo kết quả accessible.
- Màu không phải tín hiệu đúng/sai duy nhất; có icon và chữ.
- Thời gian, score, lives cập nhật có tiết chế cho screen reader; không đọc mỗi frame.
- Game có màn bắt đầu rõ, nút tạm dừng, bật/tắt âm và kết quả.
- Nếu SpeechRecognition không khả dụng: báo rõ, vẫn cho nghe và học bằng gõ.
- Không giữ màn hình toàn loading khi network lỗi.

## 7. Nội dung bản beta

Bắt đầu 30 thẻ đã kiểm tra để chứng minh toàn bộ luồng. Trước phát hành beta mở rộng thành ít nhất 300 thẻ, phân thành chủ đề nhỏ và có reviewer.

Chủ đề đề xuất: daily life, school, food, travel, work basics, feelings, shopping, health basics, environment, common actions. Đây là danh sách biên tập, không tự động cào web.

Không dùng dữ liệu 300 thẻ chưa duyệt rồi ghi là đã chuẩn hóa. Lưu nguồn, giấy phép và trạng thái review. Dữ liệu ví dụ trong examples chỉ minh họa cấu trúc.

## 8. Thống kê thật

Theo dõi phiên học, câu đã làm, từ đã ôn, thời lượng active và số ngày có hoạt động. Lấy từ event/server timestamp; không dùng số request Gemini để suy ra người dùng có học hay không.

Không tính tab đang mở nhưng paused/hidden thành thời gian học. Không cộng lại attempt đã được ghi nhận khi retry mạng.

## 9. Nghiệm thu sản phẩm

Một người chưa có tài khoản có thể hiểu game và thử bộ public. Sau đăng nhập, họ tạo bộ, import thẻ, học, chơi, đóng tab rồi vào lại để tiếp tục. AI không khả dụng không làm mất học phần, game hay lịch sử. Trên Khám phá không có tên người tạo.
