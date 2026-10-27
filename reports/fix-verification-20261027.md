# Nghiệm thu sửa F01–F08 — 27/10/2026

> Báo cáo này ghi nhận thời điểm nghiệm thu local trước yêu cầu push tiếp theo. Xem STATUS và lịch sử Git để đối chiếu việc upload; các trường pushed/deployed trong evidence JSON là snapshot tại verifiedAtUtc.

Bản sửa trên nền `abb35fa`, đang ở working tree. Review trước mô tả commit cũ và được giữ làm lịch sử. Bằng chứng máy đọc được: [JSON](fix-verification-20261027-evidence.json).

## Phần đã sửa

| Mục | Thay đổi và kiểm chứng |
| --- | --- |
| F01 / R10 | Export đúng Next Proxy; chờ request trước SDK Supabase để tránh lỗi thời gian khi prerender. Build và runtime set thật chạy được; Origin dùng host bên ngoài. |
| F02 / R03 | Queue chung cho toàn bộ mode: lưu/restore câu, đáp án, chặng, trạng thái; gửi attempts trước completion; retry giữ ID; không ghi đè tab khác. |
| F03 / R05 | Arcade/Test/detail phân trang đủ; lỗi trang 2 báo retry, không dùng bộ bị cắt. Browser kiểm tra 1.001 thẻ. List counts dùng aggregate, scope user chỉ lấy học phần của user. |
| F04 / R04 | Xác minh actor trước tương tác; keys gắn user ID. Login/đổi tài khoản không dùng chung guest history. Logout chờ queue, dừng writer rồi xóa đúng user. Browser kiểm tra A→logout→B. |
| F05 / R09 | Migration mới enforce cooldown/rate và budget provider nguyên tử toàn ứng dụng/theo user. Reserve trước từng provider call kể cả fallback; fallback chỉ dùng khi cấu hình. |
| F06 / R13 | Effects game ngoài React updater; dedupe event; một ID local/server. Cả typing/recall ghi một hit và reload đúng mode ở pause. Chuẩn hóa frame time thành mili giây nguyên. |
| F07 / R11 | Scanner fail khi scanner lỗi, không in secret, quét cả file mới. CI có integration/build/Playwright và pin CLI. Workflow remote chưa chạy trong lượt này. |
| F08 / R02 / R12 | Dashboard/Explorer dùng dữ liệu thật, bỏ demo giả lỗi/thống kê. AI pending có polling/cancel/deadline. Banner không nói nhầm dữ liệu chỉ tạm. 32 thẻ là smoke, public content giữ UNVERIFIED. |

Bổ sung từ browser tests: form không reset khi auth tải xong; ID input duy nhất; AI chấm theo batch server; transcript chấm cùng quy tắc trên server; callback hỗ trợ PKCE/TokenHash; redirect chặn control characters; thời gian lấy từ clock/engine, loại pause/tab ẩn.

## Kết quả local

- Lint: PASS, không warnings; TypeScript: PASS.
- Unit: 114/114 PASS, 16 files.
- Integration: 46/46 PASS, 10 files, Supabase local.
- Production build: PASS trên bản mã cuối.
- Playwright: **15/15 PASS**, Edge headless trên production build, gồm cả typing/recall.
- Scanner: 2/2 tests PASS, audit PASS.
- Handoff checker và `git diff --check`: PASS sau cập nhật tài liệu.

Browser suite kiểm tra: tạo học phần, mất mạng/reload/logout, private/cross-origin, 1.001 thẻ và lỗi phân trang, cả hai mode Arcade, Match theo chặng, Grammar/Reading/Translation từ cache, Test/Flashcards/Dictation, Speaking keyboard fallback, refresh phiên và reset mật khẩu.

Tài khoản/dữ liệu E2E synthetic được dọn trong `afterAll`. Server port 3197 do Playwright quản lý. Trace bị gitignore vì có thể chứa cookie thử. Cache AI synthetic không chứng minh chất lượng model thật.

Migration `20261027000005_reliable_study_and_ai_budget.sql` đã áp dụng local. Các migration 0001–0004 không sửa. Không reset hoặc đẩy migration production.

## Giới hạn nghiệm thu

1. Chưa gọi Gemini thật; model availability/billing/quota cloud chưa xác minh. Smoke provider trước production.
2. Browser tests dùng Edge headless Windows; micro/loa/phát âm và thiết bị di động thật chưa kiểm tra.
3. GitHub Actions remote, Vercel Ready và production smoke chưa xác minh. Chưa push/deploy bản sửa này.
4. Public beta cần >=300 thẻ và duyệt ngôn ngữ/nguồn độc lập. Không đóng T18 từ fixtures hoặc reviewer metadata.

Nghiệm thu áp dụng cho các đường đã kiểm tra, không tuyên bố mọi trường hợp/toàn bộ dự án không còn lỗi.
