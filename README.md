# English Vocab Arcade

Web tiếng Việt để học tiếng Anh A1–B1: bộ thẻ, Learn/Test, Match theo chặng, Word Blaster, nghe chính tả, luyện nói và bài tập AI theo ngữ cảnh. Mã ứng dụng nằm trong `web/`.

Sau lần sửa 27/10/2026: lint, TypeScript, 114 unit tests, 46 integration tests và production build local đã PASS. Kết quả browser, phạm vi và phần chưa xác minh: [báo cáo bản sửa](reports/fix-verification-20261027.md).

Chưa có bằng chứng deploy production hoặc gọi Gemini thật trong lần sửa này. Tập 32 thẻ hiện tại là dữ liệu thử nội bộ; public beta cần >=300 thẻ và duyệt ngôn ngữ độc lập. Metadata `reviewed` và hash không chứng minh đã được chuyên gia duyệt.

## Chạy local

Cần Node 24.x, npm và Docker. Từ thư mục gốc:

```powershell
cd web
npm ci
npx supabase --workdir .. start
npx supabase --workdir .. migration up --local
```

Tạo `web/.env.local` từ [mẫu cấu hình](web/.env.example) nếu chưa tồn tại. Điền URL, publishable key và server secret của đúng Supabase local/project tiếng Anh. Không lấy env từ dự án tiếng Trung. Sau đó chạy `npm run dev`.

Migration mới là `20261027000005_reliable_study_and_ai_budget.sql`; các migration đã áp dụng trước đó được giữ nguyên. Migration mới đã áp dụng vào local, chưa đẩy remote.

## Kiểm tra

Trong `web/`:

```powershell
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run build
npm run test:e2e
```

Integration/E2E dùng Supabase local. Playwright dùng Edge trên Windows; Linux cần `npx playwright install --with-deps chromium`. E2E khởi động build production tại `127.0.0.1:3197`, tạo dữ liệu synthetic rồi xóa tài khoản thử. Ca AI dùng cache synthetic, không gọi provider. Không đưa `web/test-results/` hoặc browser trace lên Git vì có thể chứa cookie phiên thử.

Từ thư mục gốc:

```powershell
node --test scripts/scan-secrets.test.mjs
node scripts/scan-secrets.mjs
node scripts/check-handoff.mjs
```

## Lưu tiến độ

- Phiên server và local queue tách theo user/học phần/mode. Khách chỉ lưu trên trình duyệt.
- Reload khôi phục câu, đáp án, chặng và trạng thái. Game đang chạy trở lại ở trạng thái pause; typing/recall được giữ theo URL và tùy chọn tài khoản.
- Attempts gửi theo thứ tự, retry giữ nguyên event ID. Lỗi mạng giữ queue; sau phục hồi vẫn đồng bộ các thay đổi mới.
- Khi tab khác sửa phiên, ứng dụng dừng ghi đè và giữ bản sao xung đột. Logout chờ queue, dừng writer rồi xóa local data của đúng user.
- Thời gian lấy từ clock/engine; pause/tab ẩn không được tính như đang trả lời. Typing có đáp án hiển thị và tự đánh giá flashcard không nâng mức thuộc từ đã kiểm chứng.

Module chính: [queue](web/src/features/study/session-sync.ts), [React hook](web/src/features/study/use-study-session.ts), [server repository](web/src/features/study/sessions.repository.ts).

## AI và ngân sách

`GEMINI_API_KEY` và Supabase secret chỉ dùng server. `AI_ENABLED=false` tắt chức năng AI; các chế độ cốt lõi/game vẫn hoạt động. Model chính dùng `GEMINI_MODEL_PRIMARY`; fallback chỉ dùng khi cấu hình `GEMINI_MODEL_FALLBACK`, không tự chọn model cũ.

| Cấu hình | Mặc định |
| --- | --- |
| `AI_DAILY_BATCHES_PER_USER` | 5 batch/ngày/user |
| `AI_OPERATIONS_PER_MINUTE_PER_USER` | 2 lượt tạo/phút/user, kể cả takeover |
| `AI_GLOBAL_DAILY_CALL_LIMIT` | 100 provider calls/ngày, toàn ứng dụng |
| `AI_GLOBAL_MINUTE_CALL_LIMIT` | 10 provider calls/phút, toàn ứng dụng |
| `AI_USER_DAILY_CALL_LIMIT` | 10 provider calls/ngày/user |

Budget được reserve nguyên tử trong DB trước mỗi provider call, kể cả fallback. Batch thất bại phải chờ cooldown. Cache hit không reserve thêm provider call. UI poll pending với deadline/cancel; lỗi học phần thật không biến thành bài mẫu. Grammar/Reading/Translation được server chấm theo batch thuộc user/học phần.

## Bàn giao

- [Trạng thái và lịch sử](tasks/STATUS.md)
- [Bằng chứng bản sửa](reports/fix-verification-20261027-evidence.json)
- [Phạm vi học liệu](reports/content-review.md)
- [Checklist phát hành](reports/release-v1.md)
- [Runbook deploy](reports/deployment.md)

GitHub push, GitHub Actions, Vercel Ready, migration production và smoke production là các bước xác minh riêng. Báo cáo review cũ được giữ theo commit đã kiểm tra.
