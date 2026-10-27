# Chuẩn bị Supabase SQL Editor — 27/10/2026

Production chưa được thay đổi trong lượt này. Website hiện dùng project `qtqvytchmlqojolkobmw`, xác định từ URL public trong client bundle. `/api/health` trả 200 với build SHA `1f1357d7114cc564a351051f16f297e3b0dc67d6`, nhưng `/api/sets?scope=explore&pageSize=1` trả 500: `Could not find the table 'public.learning_sets' in the schema cache`. Supabase CLI chưa đăng nhập; người dùng muốn chạy trực tiếp trong Dashboard.

## Thay đổi

- [Bộ SQL](../supabase/manual/english-vocab-arcade.sql) được sinh từ sáu migrations bằng [generator](../scripts/build-supabase-dashboard.mjs). Chạy toàn bộ file trong một transaction, lưu đầy đủ statements/version/name tương thích lịch sử CLI. Có guard cho database mới hoặc đúng prefix migrations của repo; từ chối schema/history không khớp.
- Migration 0006 cấp quyền bảng cụ thể cho anon/authenticated/service_role, giữ RLS, bổ sung profiles cho tài khoản có trước khi cài schema. Các migrations đã áp dụng không bị sửa.
- `save_session_state_v1` dùng kiểm tra owner không bị bỏ qua khi `auth.uid()` NULL, và quyền EXECUTE bị thu hồi đối với PUBLIC/anon. Owner và service role vẫn sử dụng được.
- CI kiểm thử generator và yêu cầu file SQL được sinh đồng bộ với migrations.

## Bằng chứng local

- `node --test scripts/build-supabase-dashboard.test.mjs`: 2/2 PASS.
- `npm run test:integration`: 47/47 PASS, gồm anon không đọc profiles và không gọi RPC lưu phiên, user khác bị chặn, owner/service role cập nhật được.
- `npm run typecheck`: PASS.
- Chạy lại 15 browser E2E với migration 0006: 14 PASS, ca Arcade typing lần đầu không thấy server chuyển `paused` sau reload. Chạy riêng lại ca đó: PASS (3,9 giây); chưa xác định nguyên nhân gián đoạn, không ghi nhận bộ E2E mới là 15/15 ổn định. Không thay đổi mã ứng dụng hoặc nới assertion trong lượt chuẩn bị SQL.
- Bộ SQL chính xác được chạy trên database PostgreSQL tạm trong container local: cài mới sáu migrations, backfill tài khoản Auth có sẵn, grants tường minh, chạy lại an toàn, lưu đúng từng statement, từ chối bảng lạ: PASS. Database tạm được xóa; database local chính không reset. Mô phỏng Auth trong bài thử bộ SQL chỉ là fixture; suite tích hợp sử dụng Supabase Auth local thật.

Hướng dẫn thao tác production: [supabase/manual/README.md](../supabase/manual/README.md). Chưa có bằng chứng thực thi SQL trên Dashboard hoặc smoke thành công với database production. Sau khi người dùng Run file, cần kiểm tra lại API học phần rồi Auth/CRUD/lưu tiến độ/AI theo checklist phát hành.

Tham khảo chính thức: [SQL Editor và bảng](https://supabase.com/docs/guides/database/tables), [grants và RLS](https://supabase.com/docs/guides/api/securing-your-api), [thay đổi automatic table exposure](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).
