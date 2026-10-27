# Biên bản Phát hành Bản Beta v1.0 — English Vocab Arcade

- **Ngày lập**: 27/10/2026
- **Trạng thái**: Release Candidate 1 (RC1) — Sẵn sàng bàn giao cloud
- **Phiên bản mã nguồn**: Next.js 16.4.3 / React 19.3.0 / TypeScript strict

---

## 1. Danh tính Bản phát hành

- **Repository**: `english-vocab-arcade` (Git local initialized on branch `main`)
- **Commit SHA**: Local Ready (đối chiếu hash qua `git rev-parse HEAD`)
- **Supabase project ref**: Chờ liên kết remote từ chủ dự án (Local stack: `http://127.0.0.1:54321`)
- **Migration cuối**: `20261026000004_ai.sql` (toàn bộ 4 migrations đã áp dụng và kiểm chứng)
- **Vercel deployment URL**: Chờ import repository từ chủ dự án
- **Stable production URL**: Chờ cấu hình domain
- **`/api/health` buildSha**: Hỗ trợ qua biến `VERCEL_GIT_COMMIT_SHA || GITHUB_SHA`
- **AI Configuration**: Model chính `gemini-2.5-flash`, fallback `gemini-1.5-flash`, hạn mức 5 batches/ngày, 2 ops/phút
- **Học liệu đã thẩm định**: 32 thẻ A1–B1 reviewed (`examples/beta-vocabulary.seed.json`), SHA-256 `f337e3c3595cd6dc96c503f8b6a1ed1eb9905cc0418a672156f06146532c3190`

---

## 2. Cổng Kiểm tra Nghiệm thu (Quality Gates)

- [x] **G0 (Code Quality & Build)**: `eslint . --max-warnings 0`, `tsc --noEmit`, 97 unit tests PASS, Next.js build PASS (36 routes).
- [x] **G1 (Database & Security)**: Migrations 0001–0004 áp dụng sạch sẽ; RLS A/B/anon phân lập 100%; RPCs `record_attempt_v1`, `reserve_ai_batch_v1`, `finalize_ai_batch_v1` nguyên tử và idempotent; 38 integration tests PASS.
- [x] **G2 (Core Features)**: Auth SSR an toàn; CRUD học phần & thẻ; phân trang con trỏ 1.001 thẻ; import CSV/XLSX; học cơ bản (Flashcards, Learn 3 chặng, Test).
- [x] **G3 (Engines & Arcade)**: Game Word Blaster 2 chế độ (gõ từ & tự nhớ); engine ghép cặp 6 pairs/chặng; xử lý va chạm & khóa mục tiêu thuần túy; hỗ trợ bàn phím di động; lưu và khôi phục phiên học qua reload.
- [x] **G4 (AI Integration & English Modules)**: Schema Zod nghiêm ngặt cho bài tập ngữ pháp, đọc hiểu, dịch ngữ cảnh; SHA-256 persistent cache (E07); hạn mức hàng ngày (D11); nghe chép chính tả & luyện nói qua Web Speech API; miễn trừ tuyên bố sai lệch về IELTS/ngữ điệu bản xứ.
- [ ] **G5 (Production Smoke Test)**: Chờ kích hoạt môi trường Vercel & Supabase production từ chủ tài khoản.

---

## 3. Danh mục Kiểm tra Production Smoke (Sẽ chạy khi có URL thật)

- [ ] Đăng ký / Xác thực email / Đăng nhập / Đổi mật khẩu đúng domain production.
- [ ] Trang Khám phá `/explore` không hiển thị tên, email, avatar hoặc username người tạo.
- [ ] Bộ thẻ riêng tư của User A không thể đọc/ghi từ User B hoặc khách vãng lai.
- [ ] Học phần 20 thẻ hoàn thành đủ các chặng học Flashcards, Learn, Test, Match, Arcade.
- [ ] Đóng tab sau khi nhận xác nhận lưu (ack), mở lại tab khôi phục đúng tiến độ và trạng thái dừng.
- [ ] Tải lại bài tập AI đọc từ cache `ai_batches`, không phát sinh thêm cuộc gọi tới Gemini provider.
- [ ] Toàn bộ chế độ học và trò chơi hoạt động bình thường khi tắt AI (`AI_ENABLED=false`).
- [ ] Kiểm tra thực tế trên thiết bị di động: kích thước bàn phím ảo, hiển thị sóng âm thanh.
- [ ] Không có secret key, Gemini key hoặc thông tin nhạy cảm rò rỉ trên browser bundle, network log hay console.
- [ ] Mở URL chính thức trong tab trình duyệt mới ở chế độ ẩn danh.
- [ ] Có kế hoạch rollback và tài liệu vận hành được cập nhật.

---

## 4. Vấn đề Đã biết và Giới hạn (Known Limitations)

| Vấn đề | Tác động | Mức độ | Cách xử lý |
|---|---|---|---|
| Web Speech API hỗ trợ phụ thuộc trình duyệt | Một số trình duyệt di động hoặc Firefox có thể chưa hỗ trợ STT trực tiếp | Thấp | Đã tích hợp sẵn chế độ gõ bàn phím dự phòng (Keyboard fallback) |
| Giới hạn gói Free Tier của Supabase & Vercel | Giới hạn số connection đồng thời và băng thông | Trung bình | Đã áp dụng phân trang con trỏ, cache AI bền vững và kiểm soát hạn mức nghiêm ngặt |
| Khách vãng lai chưa đăng nhập | Phiên học tạm thời lưu trên LocalStorage của trình duyệt | Thấp | Đã có DemoBanner và thông báo nhắc nhở đăng nhập để đồng bộ đám mây |

---

## 5. Phạm vi Thực tế Hoàn thành

- [ ] Mốc A nội bộ (Nền tảng thật)
- [ ] Mốc B game nội bộ (Word Blaster đầy đủ)
- [x] **Mốc C beta đầy đủ** (Đầy đủ toàn bộ tính năng theo đặc tả: Web học tiếng Anh độc lập, bài tập tiếng Anh A1–B1, game Arcade hai chế độ, nghe chép và nói, cache AI, RLS phân lập, tài liệu bàn giao).
