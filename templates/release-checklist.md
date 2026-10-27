# Biên bản phát hành — template

Copy sang reports/release-v1.md khi thực sự phát hành. Hiện tất cả kiểm thử ứng dụng là NOT RUN.

## Danh tính bản phát hành

- Ngày:
- Người thực hiện:
- GitHub repo:
- Commit SHA:
- Supabase project ref:
- Migration cuối:
- Vercel deployment URL:
- Stable production URL:
- /api/health buildSha:
- AI enabled/model/quota app:
- Học liệu reviewed/draft:

## Cổng kiểm tra

- [ ] G0: lint, typecheck, unit tests, build
- [ ] G1: migrations, RLS A/B/anon, transaction/idempotency
- [ ] G2: Auth, CRUD, import, học cơ bản
- [ ] G3: Arcade hai mode, match stages, mobile, resume
- [ ] G4: AI schema/cache/quota/errors
- [ ] G5: Đúng commit Ready và production smoke

## Production smoke

- [ ] Đăng nhập/confirm/reset email đúng domain
- [ ] Explore không có tên/avatar/username tác giả
- [ ] Private A không đọc được từ B/anon
- [ ] Set 20 cards học/match/game đúng
- [ ] Đóng tab sau save ack rồi mở lại đúng phiên
- [ ] Reload AI batch không phát provider request mới
- [ ] AI tắt vẫn chơi/học được
- [ ] Điện thoại thật: input, keyboard viewport, âm thanh
- [ ] Không secret trong bundle/log/report
- [ ] Đã kiểm tra stable URL trong tab mới
- [ ] Có rollback path và giới hạn được ghi rõ

## Bằng chứng

Liên kết report/test logs/screenshot có thời điểm, không secret.

## Known issues

| Vấn đề | Tác động | Mức độ | Cách xử lý/ticket |
|---|---|---|---|

## Phạm vi thực tế

Chỉ đánh một:
- [ ] Mốc A nội bộ
- [ ] Mốc B game nội bộ
- [ ] Mốc C beta đầy đủ

Không gọi đầy đủ nếu còn thiếu học liệu reviewed, mobile native test hoặc production smoke bắt buộc.
