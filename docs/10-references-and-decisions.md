# 10 — Quyết định và nguồn tham khảo

Lập ngày 26/10/2026. Nguồn web đã được đọc để chuẩn bị hồ sơ; thông số cloud có thể đổi. Model triển khai cần kiểm tra lại tại bước dùng, không áp mọi con số như hợp đồng vĩnh viễn.

## 1. Quyết định kiến trúc

| ID | Quyết định | Lý do |
|---|---|---|
| ADR-001 | App web độc lập trong folder mới | Đúng yêu cầu bàn giao, tránh sửa sản phẩm tiếng Trung |
| ADR-002 | Next app ở web/, tài liệu và Supabase ở root | Bootstrap không đè hồ sơ; Vercel root rõ |
| ADR-003 | Node 24.x, Next 16 stable pin sau P0 | Gần stack hiện có, phù hợp hosting đã kiểm chứng |
| ADR-004 | Supabase project mới | Không trộn tài khoản, dữ liệu và migrations với website cũ |
| ADR-005 | Canvas 2D + HTML input | Đủ game 2D, hỗ trợ keyboard/mobile, ít phụ thuộc |
| ADR-006 | Solo game trước, leaderboard/multiplayer sau | Không cần realtime server hoặc chống gian lận phức tạp |
| ADR-007 | Cache AI bền vững theo user/snapshot | Đóng tab vẫn mở lại bài cũ; tránh lộ private content |
| ADR-008 | Profile riêng tư, explore không query author | Giữ yêu cầu ẩn tên tác giả từ sản phẩm trước |
| ADR-009 | Session snapshots + attempts idempotent | Resume đáng tin cậy, retry không cộng count |
| ADR-010 | Grading theo loại bài | Không nhầm string similarity với năng lực ngôn ngữ |
| ADR-011 | Local DB cho dev khi free slot hạn chế | Không cần tạo cloud project thứ ba |
| ADR-012 | Không scaffold app trong lần lập kế hoạch | User bàn giao implementation cho Gemini; giữ trạng thái trung thực |

Các lựa chọn chưa cần chốt ngay: brand cuối, domain, repo visibility, credentials, SMTP provider và ngân sách khi tăng traffic. Dùng tên kỹ thuật mặc định; chỉ thu thập account info khi tới bước cần.

## 2. Nguồn nội bộ đã rà

Repo tiếng Trung ở D:\Study\personal project\quizzlet clone\quizlet-clone.
Commit tham chiếu 2a1109e83582615364373ebb55176dcfac7f452a.
Đã đọc: package.json, database.types.ts, schema.sql, AI routes, speech/question generator, cards service, match và study-session.

Phát hiện dẫn tới kế hoạch:
- Đã có nhiều nhánh hỗ trợ English.
- Translate route còn hard-code Chinese/HSK.
- Câu AI chủ yếu giữ React state, chưa có persistent cache.
- Speech grading chủ yếu so transcript, có substring matching quá dễ.
- Tiến độ cũ lưu local + Supabase nhưng cần version/idempotency tốt hơn.
- Explore đã sửa ẩn tên tác giả, cần duy trì trong app mới.

## 3. Nguồn chính thức

| Chủ đề | URL | Dùng trong hồ sơ |
|---|---|---|
| Next installation | https://nextjs.org/docs/app/getting-started/installation | Bootstrap, version/API thực tế, linter riêng |
| Supabase SSR | https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs | Cookie auth, browser/server clients, verification |
| Supabase RLS | https://supabase.com/docs/guides/database/postgres/row-level-security | Policies và kiểm tra quyền |
| Supabase migrations | https://supabase.com/docs/guides/local-development/database-migrations | Migration files và deploy DB |
| Supabase workflow | https://supabase.com/docs/guides/local-development/cli-workflows | Dry-run, local/remote và tránh reset production |
| Supabase redirects | https://supabase.com/docs/guides/auth/redirect-urls | Auth callbacks và site URL |
| Supabase pricing | https://supabase.com/pricing | Free slots và tài nguyên cần xác minh |
| Vercel Node | https://vercel.com/docs/functions/runtimes/node-js/node-js-versions | Runtime Node 24.x |
| Vercel environment | https://vercel.com/docs/environment-variables | Scope env và deployment mới |
| Vercel deployments | https://vercel.com/docs/deployments/managing-deployments | Kiểm tra Ready, alias và release |
| Gemini models | https://ai.google.dev/gemini-api/docs/models | Model ID không tự đoán |
| Gemini schemas | https://ai.google.dev/gemini-api/docs/structured-output | Structured JSON và validation |
| Gemini rate limits | https://ai.google.dev/gemini-api/docs/rate-limits | Quota project/model, không theo API key riêng |
| MDN SpeechRecognition | https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition | Browser support và fallback |
| Parroto typing | https://parroto.app/vi/vocabulary/typing-game | Chỉ tham khảo ý tưởng typing shooter |
| Parroto recall | https://parroto.app/vi/vocabulary/word-rain | Chỉ tham khảo ý tưởng nghĩa + gõ từ |

Các hằng số game, schema DB, API và app budgets trong hồ sơ là thiết kế của dự án này, không được tuyên bố là cơ chế nội bộ hoặc quota của Parroto/Google.

## 4. Nhật ký quyết định tiếp theo

Khi đổi một quyết định, thêm:
- Ngày, ID ADR mới hoặc ADR được thay.
- Đề nghị của ai và phạm vi người dùng đã chấp thuận.
- Tác động lên data/contracts/test/deploy.
- Các tài liệu/tickets đã đồng bộ.

Không để PLAN nói một kiểu, source dùng kiểu khác và STATUS vẫn đánh DONE.
