# Báo cáo Triển khai — English Vocab Arcade

Ngày lập: 27/10/2026.
Trạng thái: **Sẵn sàng triển khai (Ready for Cloud Connection)**.

---

## 1. Tổng quan Trạng thái Triển khai

| Thành phần | Trạng thái | Ghi chú |
|---|---|---|
| **Mã nguồn ứng dụng (`web/`)** | **SẴN SÀNG** | Next.js 16.4.3, React 19, TypeScript strict, Tailwind v4, 36 routes biên dịch hoàn tất |
| **Kiểm thử (Test Matrix)** | **135/135 PASS** | 97 unit tests, 38 integration tests, 0 lint warnings, 0 typecheck errors |
| **Cơ sở dữ liệu (Database)** | **SẴN SÀNG** | 4 migrations (0001–0004), RLS nghiêm ngặt, atomic RPCs, đã kiểm chứng trên Docker |
| **Kho Git Local** | **SẴN SÀNG** | Đã khởi tạo branch `main`, cấu hình `.gitignore` chặn rò rỉ secret / build artifacts |
| **CI Workflow** | **SẴN SÀNG** | `.github/workflows/ci.yml` (secret scan, check-handoff, lint, typecheck, test, build) |
| **Học liệu Beta** | **SẴN SÀNG** | 32 thẻ A1–B1 reviewed trong `examples/beta-vocabulary.seed.json` (SHA-256 xác minh) |
| **GitHub Remote** | **CHỜ CẤP** | Cần chủ dự án tạo repository mới trên GitHub và push |
| **Supabase Production** | **CHỜ CẤP** | Cần chủ dự án tạo project mới trên Supabase Dashboard và link CLI |
| **Vercel Production** | **CHỜ CẤP** | Cần import repository mới vào Vercel (Root Directory: `web`) |

---

## 2. Hướng dẫn Kết nối Supabase Production (T20)

### Bước 2.1: Tạo Supabase Project mới
1. Đăng nhập [Supabase Dashboard](https://supabase.com/dashboard).
2. Nhấn **New Project**:
   - Organization: Chọn organization của bạn.
   - Name: `english-vocab-arcade`.
   - Region: Chọn `Singapore (ap-southeast-1)` (hoặc vùng gần người dùng và Vercel runtime).
   - Database Password: Đặt mật khẩu mạnh (lưu vào trình quản lý mật khẩu an toàn, không ghi vào tài liệu).
3. Sau khi project sẵn sàng, sao chép:
   - **Project Ref** (ví dụ: `abcdefghijklmnop`).
   - **Project URL** (`https://<PROJECT_REF>.supabase.co`).
   - **Publishable Key** (anon key).
   - **Secret Key** (service_role key, chỉ dùng server-side).

### Bước 2.2: Liên kết CLI và Áp dụng Migrations
Từ thư mục `web/`:
```powershell
npx supabase --workdir .. login
npx supabase --workdir .. link --project-ref <ENGLISH_PROJECT_REF>
npx supabase --workdir .. migration list
npx supabase --workdir .. db push --dry-run
npx supabase --workdir .. db push
```
> [!IMPORTANT]
> Tuyệt đối không dùng cờ `--linked` với lệnh `db reset` trên production. Lệnh `db push` sẽ chỉ áp dụng các migration chưa có trên remote theo đúng thứ tự (0001 → 0002 → 0003 → 0004).

### Bước 2.3: Cấu hình Authentication trên Supabase
1. Vào **Authentication** -> **URL Configuration**:
   - **Site URL**: `https://<YOUR_PRODUCTION_DOMAIN>`
   - **Redirect URLs (Allowlist)**:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/confirm`
     - `https://<YOUR_PRODUCTION_DOMAIN>/auth/callback`
     - `https://<YOUR_PRODUCTION_DOMAIN>/auth/confirm`
     - `https://<YOUR_PRODUCTION_DOMAIN>/reset-password`
2. Vào **Authentication** -> **Providers** -> **Email**:
   - Bật `Enable Email signup`.
   - Bật `Confirm email`.
   - Cấu hình template dùng token hash hoặc OTP code phù hợp với luồng `/auth/confirm`.

### Bước 2.4: Nhập Học liệu Beta có Kiểm soát (Optional Seed)
Sau khi tạo tài khoản publisher/admin trên hệ thống:
```powershell
Push-Location './web'
npm run seed:content -- --target production --project-ref <ENGLISH_PROJECT_REF> --allow-production --file ../examples/beta-vocabulary.seed.json
Pop-Location
```

---

## 3. Hướng dẫn Kết nối GitHub & Vercel (T21)

### Bước 3.1: Kết nối GitHub Repository mới
```powershell
# Kiểm tra lại commit local
git status
git log -n 1 --oneline

# Thêm remote origin và push lên branch main
git remote add origin https://github.com/<OWNER>/english-vocab-arcade.git
git branch -M main
git push -u origin main
```

### Bước 3.2: Thiết lập Vercel Project
1. Đăng nhập [Vercel Dashboard](https://vercel.com/new).
2. Import repository `english-vocab-arcade`.
3. Cấu hình cấu trúc dự án:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `web` (bắt buộc)
   - **Build Command**: `npm run build`
   - **Install Command**: `npm ci`
4. Cấu hình **Environment Variables** (Phạm vi Production):
   - `NEXT_PUBLIC_APP_URL` = `https://<YOUR_PRODUCTION_DOMAIN>`
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<ENGLISH_PROJECT_REF>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `<YOUR_PUBLISHABLE_KEY>`
   - `SUPABASE_SECRET_KEY` = `<YOUR_SECRET_KEY>` (chỉ server)
   - `GEMINI_API_KEY` = `<YOUR_GEMINI_API_KEY>` (chỉ server)
   - `GEMINI_MODEL_PRIMARY` = `gemini-2.5-flash`
   - `GEMINI_MODEL_FALLBACK` = `gemini-1.5-flash`
   - `AI_ENABLED` = `false` (bật thành `true` sau khi smoke test hoàn tất)
   - `AI_DAILY_BATCHES_PER_USER` = `5`
   - `AI_OPERATIONS_PER_MINUTE_PER_USER` = `2`
   - `AI_PROVIDER_CALLS_PER_DAY` = `50`
   - `APP_ENV` = `production`
   - `DEMO_MODE` = `false`
5. Nhấn **Deploy** và chờ trạng thái `Ready`.

---

## 4. Kiểm chứng Production Smoke (T22)

Sau khi Vercel báo Ready, mở tab trình duyệt mới (khách vãng lai / ẩn danh) và kiểm tra:
1. `GET /api/health`:
   - Phản hồi HTTP 200: `{"status": "ok", "app": "english-vocab-arcade", "buildSha": "<COMMIT_SHA>"}`.
   - Đối chiếu `buildSha` với commit SHA mới nhất trên GitHub main.
2. Kiểm tra giao diện người dùng:
   - Trang chủ `/` hiển thị đầy đủ Hero banner, chế độ học, Word Blaster demo banner.
   - Trang Khám phá `/explore` tải danh sách học phần công khai, **tuyệt đối không hiển thị tên/avatar/username của người tạo**.
3. Luồng xác thực:
   - Đăng ký tài khoản A -> nhận email xác thực -> đăng nhập thành công.
   - Đăng xuất -> Đăng nhập lại -> Kiểm tra phiên giữ nguyên khi F5.
4. Phân lập dữ liệu:
   - Tài khoản A tạo bộ thẻ riêng tư (private set).
   - Tài khoản B và khách ẩn danh không thể xem bộ thẻ của tài khoản A (HTTP 404/403).
5. Học tập và Chơi game:
   - Chơi Flashcards, Learn, Test, Match và Word Blaster (chế độ gõ từ và gợi nhớ).
   - Lưu tiến độ -> Đóng tab -> Mở lại: Kiểm tra trạng thái học tập được khôi phục chính xác.
6. Thử nghiệm AI có Quota:
   - Bật `AI_ENABLED=true` trên Vercel.
   - Tạo bài tập ngữ pháp/đọc hiểu/luyện dịch -> Xem bài tập -> F5 tải lại đọc từ bộ đệm bền vững `ai_batches` (không tăng số lần gọi provider).
