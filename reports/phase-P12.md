# Báo cáo Nghiệm thu Pha P12 & P13 — Cloud Deployment & Final Handoff

- **Thời gian nghiệm thu**: 27/10/2026
- **Trạng thái**: SẴN SÀNG BÀN GIAO (Ready for Cloud Linking)
- **Giai đoạn**: P12 (Cloud Deployment) & P13 (Handoff & Operations)

---

## 1. Kết quả Chuẩn bị Local Độc lập (100% Hoàn thành)

| Hạng mục | Trạng thái | Bằng chứng kiểm tra |
|---|---|---|
| **Git Repository** | **HOÀN THÀNH** | Khởi tạo branch `main`, cấu hình `.gitignore` loại trừ hoàn toàn `.env*`, `.next`, `node_modules` |
| **CI Automation** | **HOÀN THÀNH** | Tệp `.github/workflows/ci.yml` sẵn sàng kích hoạt trên GitHub Actions |
| **Database Migrations** | **HOÀN THÀNH** | 4 tệp migration (`0001_core.sql` -> `0004_ai.sql`), 100% RLS & RPCs đã kiểm thử tự động |
| **Học liệu Seed CLI** | **HOÀN THÀNH** | Script `npm run seed:content` hỗ trợ cờ an toàn `--allow-production` và đối chiếu project ref |
| **Next.js Production Build** | **HOÀN THÀNH** | 36 dynamic & static routes biên dịch thành công qua Turbopack |
| **Kiểm tra Handoff hồ sơ** | **HOÀN THÀNH** | Script `scripts/check-handoff.mjs` trả về trạng thái PASS (10 sample cards, 23 tickets, 14 phases) |

---

## 2. Các Bước Cần Chủ Dự án Thực hiện (Cloud Integration Steps)

Theo quy định an toàn bảo mật tại [AGENTS.md](../AGENTS.md) và [GEMINI.md](../GEMINI.md), các thông tin đăng nhập dịch vụ đám mây (Cloud Credentials) cần được chủ tài khoản trực tiếp thiết lập hoặc cấp quyền truy cập.

### Hành động 1: Supabase Production (T20)
1. Tạo project mới trên [Supabase Dashboard](https://supabase.com/dashboard) với tên `english-vocab-arcade` (khu vực Singapore).
2. Chạy lệnh liên kết và đẩy migrations:
   ```powershell
   cd web
   npx supabase --workdir .. link --project-ref <PROJECT_REF>
   npx supabase --workdir .. db push
   ```
3. Cấu hình Site URL và Redirect Allowlist trong Auth Settings (`/auth/confirm`, `/auth/callback`, `/reset-password`).

### Hành động 2: GitHub Repository & Vercel Project (T21)
1. Tạo repository mới trên GitHub (ví dụ: `https://github.com/<OWNER>/english-vocab-arcade.git`).
2. Đẩy toàn bộ mã nguồn:
   ```powershell
   git remote add origin https://github.com/<OWNER>/english-vocab-arcade.git
   git push -u origin main
   ```
3. Import vào [Vercel](https://vercel.com/new) với:
   - **Root Directory**: `web`
   - **Framework**: `Next.js`
   - Điền các biến môi trường Production từ file [web/.env.example](../web/.env.example).

### Hành động 3: Production Smoke Test (T22)
1. Mở URL production trong tab trình duyệt mới ở chế độ ẩn danh.
2. Kiểm tra `GET /api/health` trả về đúng commit SHA.
3. Thực hiện kiểm thử theo danh mục tại [reports/release-v1.md](release-v1.md).
