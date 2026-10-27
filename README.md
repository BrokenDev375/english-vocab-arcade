# English Vocab Arcade — Nền tảng Học Từ vựng Tiếng Anh Trực quan

Web học tiếng Anh hiện đại dành cho người Việt, tập trung vào từ vựng và cấu trúc câu A1–B1 với phương pháp học tập kết hợp trò chơi phản xạ trực quan (**Word Blaster**), lặp lại ngắt quãng (SRS) và các bài tập thực hành ngữ cảnh.

---

## 1. Trạng thái Dự án (Release Candidate 1)

- **Mã nguồn ứng dụng**: Đã hoàn tất 100% chức năng theo đặc tả trong thư mục `web/`.
- **Kiểm thử tự động**: 135/135 tests PASS (97 unit tests, 38 integration tests).
- **Chất lượng mã**: 0 ESLint warnings, 0 TypeScript errors, 36 Next.js routes biên dịch Turbopack thành công.
- **An toàn bảo mật**: RLS kích hoạt trên 100% bảng exposed; không rò rỉ secret key hoặc auth token; trang Khám phá bảo vệ danh tính tuyệt đối.
- **Bàn giao vận hành**: Đã sẵn sàng kết nối dịch vụ đám mây (GitHub, Supabase Production, Vercel) theo [reports/deployment.md](reports/deployment.md).

---

## 2. Tính năng Chính

### 2.1. Học tập Nền tảng (Core Study Modules)
- **Flashcards 3D**: Lật thẻ 3 chiều mượt mà, hỗ trợ phát âm tiếng Anh chuẩn (TTS 1.0x & 0.75x) và phím tắt Space / Mũi tên.
- **Chế độ Học (Learn Mode)**: 3 chặng thích ứng (trắc nghiệm 4 lựa chọn, điền từ khuyết, gõ từ chính xác); ghi nhận lỗi sai và ôn tập vòng lặp riêng.
- **Chế độ Kiểm tra (Test Mode)**: Đánh giá toàn diện kiến thức của học phần với bảng điểm chi tiết.
- **Ghép cặp (Match Mode)**: Chia nhóm 6 cặp/chặng năng động, đồng hồ bấm giờ trực tiếp và giải quyết xung đột nhấp chuột.

### 2.2. Trò chơi Chủ lực — Word Blaster (Arcade Game)
- Game Canvas 2D tốc độ cao 60 FPS, tỷ lệ co giãn DPR sắc nét.
- **2 chế độ chơi**:
  1. *Luyện gõ từ*: Mục tiêu hiển thị từ tiếng Anh, gõ đúng để bắn hạ.
  2. *Gợi nhớ từ*: Mục tiêu hiển thị nghĩa tiếng Việt, tự nhớ và gõ từ tiếng Anh tương ứng.
- Khóa mục tiêu thông minh (urgency tie-break), 3 mạng chơi, bảng điểm và hỗ trợ bàn phím di động mượt mà.

### 2.3. Bài tập Tiếng Anh Ngữ cảnh (English Modules)
- **Luyện ngữ pháp**: Ghép các thẻ từ xáo trộn để tạo câu tiếng Anh hoàn chỉnh, đối chiếu theo các trật tự chấp nhận được (`acceptedTokenOrders`).
- **Đọc hiểu**: Đoạn văn bản A1–B1 kèm bản dịch tham khảo tùy chọn và 4 câu hỏi trắc nghiệm kiểm tra khả năng nắm bắt nội dung.
- **Luyện dịch Việt → Anh**: Dịch tự do đối chiếu với đáp án tham chiếu chuẩn hóa, không dùng các thuật toán giả định sai ngữ pháp.
- **Chính tả (Dictation)**: Nghe phát âm mẫu và gõ lại chính xác từ vựng kèm hiển thị phiên âm IPA.
- **Luyện nói (Speaking)**: Thu âm phát âm qua Web Speech API, chấm điểm theo token chuẩn xác, kèm chế độ gõ bàn phím dự phòng (Keyboard fallback).

### 2.4. Trí tuệ Nhân tạo & Bộ đệm Bền vững (AI & Quota)
- Tích hợp Gemini 2.5 Flash (fallback 1.5 Flash) qua module server-only an toàn.
- Bộ đệm bền vững trên database với khóa băm SHA-256 (E07 cache hit không phát sinh thêm cuộc gọi nhà cung cấp).
- Kiểm soát hạn mức nguyên tử theo ngày và theo phút (D11 daily quota lock).

---

## 3. Khởi chạy Ứng dụng Local

### Yêu cầu Hệ thống
- **Node.js**: `v24.x`
- **npm**: `11.x`
- **Docker**: Khả dụng để chạy Supabase local stack

### Cài đặt và Chạy Development
```powershell
# Di chuyển vào thư mục web
cd web

# Cài đặt thư viện
npm install

# Khởi chạy Next.js Turbopack dev server (cổng 3000)
npm run dev
```

### Chạy Supabase Local (Docker)
```powershell
# Từ thư mục web, khởi động cụm Supabase local
npx supabase --workdir .. start

# Xem trạng thái migration đã áp dụng
npx supabase --workdir .. migration list
```

---

## 4. Kiểm thử Toàn diện

```powershell
cd web

# 1. Kiểm tra Linting (ESLint v9 flat config)
npm run lint

# 2. Kiểm tra Kiểu dữ liệu (TypeScript strict)
npm run typecheck

# 3. Chạy Unit Tests (Vitest)
npm run test

# 4. Chạy Integration Tests (Supabase RLS & Contracts)
npm run test:integration

# 5. Biên dịch Production Build
npm run build

# 6. Kiểm tra Toàn vẹn Hồ sơ Bàn giao (từ thư mục root)
cd ..
node scripts/check-handoff.mjs
```

---

## 5. Bản đồ Tài liệu & Báo cáo

| Tài liệu / Báo cáo | Nội dung chi tiết |
|---|---|
| [PLAN.md](PLAN.md) | Kế hoạch tổng thể 14 giai đoạn (P0–P13) và 23 ticket (T00–T22) |
| [tasks/STATUS.md](tasks/STATUS.md) | Trạng thái triển khai và nhật ký kiểm thử chi tiết của từng ticket |
| [docs/08-deployment-runbook.md](docs/08-deployment-runbook.md) | Quy trình vận hành, triển khai cloud, bảo mật và rollback |
| [docs/09-work-breakdown.md](docs/09-work-breakdown.md) | Tiêu chí nghiệm thu chi tiết cho từng tác vụ |
| [reports/deployment.md](reports/deployment.md) | Hướng dẫn kết nối Supabase, GitHub và Vercel cho chủ dự án |
| [reports/release-v1.md](reports/release-v1.md) | Biên bản nghiệm thu phát hành bản Beta v1.0 |
| [reports/phase-P11.md](reports/phase-P11.md) | Báo cáo nghiệm thu chất lượng, CI và kiểm toán bảo mật |
| [reports/phase-P12.md](reports/phase-P12.md) | Báo cáo nghiệm thu giai đoạn triển khai và bàn giao |
| [reports/content-review.md](reports/content-review.md) | Thẩm định 32 thẻ từ vựng Beta A1–B1 có chữ ký biên tập |
| [reports/provider-check.md](reports/provider-check.md) | Báo cáo xác thực adapter mô hình Gemini AI |
| [reports/environment.md](reports/environment.md) | Báo cáo môi trường hệ thống và phiên bản thư viện |
| [templates/release-checklist.md](templates/release-checklist.md) | Mẫu danh mục kiểm tra phát hành tiêu chuẩn |
