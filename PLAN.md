# Kế hoạch tổng thể — English Vocab Arcade

Phiên bản 1.0 • 26/10/2026 • Tình trạng: PLANNED.

## 1. Kết quả phải bàn giao

Một web tiếng Anh độc lập, source nằm trong web/, database và Auth Supabase riêng, repository GitHub riêng, Vercel project riêng. Sản phẩm cho phép học từ vựng theo bộ, ôn tập theo tiến độ, chơi game gõ từ và học với câu ví dụ có thể mở lại sau khi đóng trang.

Mục tiêu phát hành đầu: người Việt học từ/cụm từ A1–B1. Không tự nhận là hệ thống chấm chứng chỉ hoặc khóa luyện thi hoàn chỉnh.

Tên làm việc: English Vocab Arcade. Tên game trong app: **Word Blaster**. Tên chỉ là cấu hình nội bộ, có thể đổi brand sau; không chặn triển khai.

## 2. Quyết định đã chốt

| Hạng mục | Quyết định |
|---|---|
| Sản phẩm | Web responsive; giao diện Việt, học tiếng Anh |
| Stack | Next.js 16 ổn định, React tương thích, TypeScript strict, Tailwind, npm |
| Runtime | Node 24.x |
| UI | Component đơn giản, lucide-react; tránh kéo nhiều framework UI |
| Game | Canvas 2D cho cảnh; React/HTML cho nút, form, chỉ dẫn |
| Database/Auth | Supabase riêng, migration có version, RLS mọi bảng exposed |
| AI | Server-side Gemini, structured JSON, validate, cache bền vững, quota |
| Hosting | Vercel, GitHub main là production branch |
| Repo cũ | Chỉ đọc và tái sử dụng có chọn lọc; không tác động dữ liệu hiện có |
| Nội dung | Mẫu ban đầu + học liệu được kiểm tra; không cào trang Parroto |
| Quyền riêng tư UI | Khám phá không hiển thị danh tính người tạo |
| Bảng xếp hạng | Ngoài MVP; chỉ có lịch sử cá nhân |

## 3. Ba mốc phát hành

**Mốc A — nền tảng thật:** Auth, database, CRUD học phần, import, flashcard, Learn/Test, ghép cặp và lưu tiến độ. Không có AI vẫn học được.

**Mốc B — game chủ lực:** Word Blaster đủ hai chế độ, chặng không trùng, 3 mạng, mobile input, pause/resume và lịch sử phiên. Đây là phạm vi tối thiểu trước khi quảng bá game.

**Mốc C — bản beta đầy đủ:** nội dung AI lưu lại, bài ngữ pháp/đọc hiểu/dịch Việt–Anh, nghe chép và luyện nói cơ bản, kiểm thử an toàn dữ liệu, production smoke test.

Không dừng ở mốc A rồi báo toàn bộ dự án xong. Có thể phát hành thử nội bộ từng mốc, nhưng trạng thái phải ghi rõ.

## 4. Giai đoạn và cổng nghiệm thu

| Giai đoạn | Công việc | Phụ thuộc | Điều kiện qua |
|---|---|---|---|
| P0 | Xác minh môi trường, bootstrap web/, khóa versions | Không | Shell chạy, typecheck/lint/build pass |
| P1 | Design system, shell, điều hướng, demo có nhãn | P0 | Desktop/mobile dùng được, lỗi/empty/loading rõ |
| P2 | Migrations, constraints, RLS, RPC, generated types | P0 | Apply DB mới và test A/B/anon pass |
| P3 | Auth SSR: signup/login/confirm/reset/logout | P1,P2 | Phiên bền sau refresh; route bảo vệ đúng |
| P4 | Học phần, CRUD thẻ, import, khám phá, seed | P3 | Bộ >1.000 thẻ không mất dữ liệu; không lộ tên |
| P5 | Engine câu hỏi, flashcard, Learn/Test, review | P4 | Đáp án và câu hỏi không mâu thuẫn; lỗi học được lưu |
| P6 | Ghép cặp 6 cặp/chặng, progress và kết thúc lượt | P5 | 20 thẻ = 6+6+6+2, không trùng ID |
| P7 | Word Blaster engine và hai mode, UX mobile | P4 | Game chạy độc lập AI, tests deterministic pass |
| P8 | Persistence server, idempotency, resume, statistics | P5,P6,P7 | Refresh/đóng mở tab không mất phiên đã lưu |
| P9 | Gemini adapter, schemas, cache, quota và retry | P2,P3,P4 | Reload không gọi lại batch hợp lệ; lỗi không treo |
| P10 | Ngữ pháp, đọc hiểu, dịch Việt–Anh, nghe/nói | P5,P9 | Luồng tiếng Anh end-to-end; phản hồi nói đúng giới hạn |
| P11 | Kiểm thử tổng hợp, accessibility, lỗi mạng, auth/privacy | P8,P10 | Release checklist đạt; không còn blocker |
| P12 | GitHub, Supabase production, Vercel preview và production | P11 | Đúng commit Ready + smoke test URL thật |
| P13 | Bàn giao, tài liệu vận hành, ghi giới hạn | P12 | Chủ dự án tái hiện cài đặt, quản lý nội dung, deploy |

Chi tiết ticket và test ở docs/09-work-breakdown.md và docs/07-tests-and-acceptance.md.

## 5. Trình tự trong mỗi giai đoạn

1. Đọc tài liệu liên quan và trạng thái thực tế.
2. Chọn ticket đủ phụ thuộc; giới hạn thay đổi vào ticket.
3. Làm logic thuần và data contract trước UI.
4. Viết tests cho invariant quan trọng, rồi nối UI.
5. Chạy cổng kiểm tra. Sửa lỗi của thay đổi, không che lỗi bằng disable.
6. Cập nhật trạng thái kèm bằng chứng; commit có tên rõ nếu repo đã được tạo và user đã giao triển khai.
7. Tiếp tục phần độc lập khi bước cloud bị chặn credential.

## 6. Phạm vi bản beta

Bắt buộc:
- Đăng nhập email/password, xác minh email và quên mật khẩu.
- Học phần public/private, import CSV/XLSX có preview/validate.
- Hán tự/HSK không xuất hiện trong sản phẩm tiếng Anh.
- Mỗi từ có một nghĩa chính rõ, từ loại, IPA tùy chọn, ví dụ và đáp án chấp nhận được.
- Flashcard; câu hỏi chọn đáp án, gõ từ và điền từ; Test có kết quả.
- Ghép cặp; Word Blaster có typing và recall.
- Nghe chép với giọng trình duyệt; luyện nói có fallback khi không hỗ trợ mic.
- Nội dung AI có nhãn, cache, phân quyền, quota và xử lý lỗi.
- Tiến độ và lịch sử học qua reload/thiết bị; thống kê dựa hoạt động học, không dựa request AI.
- Production sử dụng database mới và kiểm tra thực tế sau deploy.

Ngoài phạm vi:
- Multiplayer, voice/video chat, mạng xã hội, thanh toán, native Android/iOS.
- Chấm IELTS/TOEIC toàn diện; chấm âm vị hoặc giọng nói chuyên sâu.
- Thu thập/copy học liệu, ảnh hoặc code của website khác.
- Upload video/audio dài, YouTube ingestion, phát trực tiếp hoặc websocket server.
- AI được gọi trong vòng lặp game hoặc mỗi chữ gõ.

## 7. Phụ thuộc bên ngoài

Nếu chưa có Supabase, dùng local Supabase khi Docker khả dụng; ưu tiên hoàn thành schema, engine và contract tests. Demo fixture được phép có nhãn và feature flag; không được thay thế kiểm thử RLS thật.

Khi không có Docker: làm app shell/engine/test trước, sau đó dùng project development riêng được chủ tài khoản cấp. Không mượn database website tiếng Trung.

Khi chưa có Gemini: toàn bộ game và học cơ bản vẫn chạy; trang AI báo chưa cấu hình và có nội dung mẫu được ghi nguồn rõ.

Khi chưa có quyền GitHub/Vercel: chuẩn bị source, CI, migrations, env example, checklist và release candidate. Phần deploy giữ BLOCKED chứ không DONE.

## 8. Ước lượng và ưu tiên

Không cam kết số ngày trước khi P0/P2 xác minh môi trường và tài khoản. Chi phí chủ yếu là học liệu, AI và dịch vụ khi traffic tăng; free tier chỉ được xem là cơ sở thử nghiệm, không là đảm bảo vận hành không giới hạn.

Nếu cần giảm phạm vi, thứ tự giảm: cosmetic nâng cao → speaking nâng cao → bài đọc đa dạng → AI sinh mới hàng loạt. Giữ nguyên RLS, lưu tiến độ, luật game, cache và kiểm thử chính.

## 9. Bằng chứng hoàn thành

- Báo cáo test có thời điểm, môi trường và lệnh thật.
- Tệp migration được commit, không chỉ có ảnh SQL Editor.
- Commit hash phát hành và URL production.
- Vercel deployment Ready tương ứng hash đó.
- Smoke test ở URL production có tài khoản A/B, test phiên ẩn danh và lỗi AI.
- Known issues rõ tác động; không còn placeholder trong luồng bắt buộc.
- tasks/STATUS.md và templates/release-checklist.md được điền trung thực.

Tài liệu là kế hoạch, không chứng minh sản phẩm đã tồn tại. Model triển khai phải tự xác minh từng cổng.
