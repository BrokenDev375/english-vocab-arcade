# Checklist phát hành — cập nhật 27/10/2026

> Báo cáo này ghi nhận thời điểm nghiệm thu local trước yêu cầu push tiếp theo. Xem STATUS và lịch sử Git để đối chiếu việc upload; các trường pushed/deployed trong evidence JSON là snapshot tại verifiedAtUtc.

Hiện trạng: bản sửa local trên nền `abb35fa`, chưa push/deploy trong lượt này. Xem [kết quả và phạm vi kiểm chứng](fix-verification-20261027.md).

| Cổng | Bằng chứng hiện có |
| --- | --- |
| Code quality | Lint và TypeScript PASS |
| Logic/database | 114 unit tests và 46 integration tests PASS |
| Production build local | PASS |
| Browser local | Core study, hai mode game, AI cache, privacy, recovery/refresh; kết quả cuối trong báo cáo bản sửa |
| Secret scanner | Scanner và 2 tests mẫu/error handling PASS; không phải chứng nhận không còn mọi dạng secret |
| Migration local | 0001–0005 đã áp dụng; không sửa ngược migration cũ |
| Provider thật | UNVERIFIED; không gọi Gemini thật trong lần sửa |
| Học liệu public beta | UNVERIFIED; hiện 32 thẻ smoke, cần >=300 thẻ và kiểm duyệt độc lập |
| GitHub Actions remote | UNVERIFIED; workflow đã thêm integration/E2E/scanner |
| Supabase/Vercel production | Chưa triển khai/xác minh trong lượt này |

Trước deploy: chọn đúng Supabase project tiếng Anh, áp dụng đủ 5 migrations mà không reset dữ liệu, cấu hình environment phù hợp, xác minh tên model bằng tài khoản provider thực tế. Fallback là tùy chọn, không mặc định Gemini 1.5.

Checklist riêng sau deploy:

- [ ] Signup/confirm, login/logout, recovery và refresh cookie đúng domain.
- [ ] Supabase redirect allowlist/email template khớp callback/TokenHash.
- [ ] B/anon không đọc/ghi học phần private, tiến độ và cache của A.
- [ ] Explorer không lộ tên, username hay avatar tác giả.
- [ ] Học đủ thẻ, reload đúng câu/chặng; typing/recall giữ đúng mode và pause.
- [ ] Ngắt/kết nối lại mạng không mất/nhân đôi attempt; đổi user không dùng chung history.
- [ ] Cache không gọi provider; failed/cooldown/fallback không vượt budget.
- [ ] Micro/TTS/bàn phím ảo trên thiết bị đích. Điểm transcript không phải chấm âm vị/ngữ điệu/IELTS.
- [ ] Kiểm tra budget, log, rollback, deployment Ready và `/api/health` đúng build.

Local tests không thay production smoke. Nạp fixtures không chứng minh hoàn thành học liệu công khai.
