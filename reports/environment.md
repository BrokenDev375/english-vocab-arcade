# Báo cáo môi trường thực tế (Environment Report)

Ngày xác minh: 26/10/2026.
Ticket: T00 (Giai đoạn P0 — Xác minh và bootstrap).

## 1. Môi trường hệ thống

| Thành phần | Phiên bản thực tế | Ghi chú |
|---|---|---|
| Hệ điều hành | Windows | Khớp môi trường phát triển local |
| Node.js | `v24.13.1` | Thỏa mãn yêu cầu Node 24.x |
| npm | `11.10.0` | Thỏa mãn yêu cầu package-lock.json v3 |
| Git | `2.51.0.windows.2` | Sẵn sàng cho khởi tạo git repository |
| Docker | `29.4.0` (build 9d7ad9f) | Sẵn sàng cho Supabase local CLI |

## 2. Phiên bản package trong `web/`

| Package | Phiên bản đã ghim / cài đặt | Vai trò |
|---|---|---|
| `next` | `16.4.3` | Next.js 16 stable App Router |
| `react` | `19.3.0` | React core tương thích |
| `react-dom` | `19.3.0` | React DOM renderer |
| `typescript` | `^5.9.3` | TypeScript strict mode |
| `tailwindcss` | `^4.1.1` | Tailwind CSS v4 |
| `@tailwindcss/turbopack` | `^4.1.1` | Turbopack build integration |
| `eslint` | `^9.39.5` | ESLint v9 (flat config `eslint.config.mjs`) |
| `eslint-config-next` | `16.4.3` | Rule chuẩn Next.js 16 |
| `vitest` | `^5.0.5` | Test runner cho unit & engine logic |
| `zod` | `^4.6.7` | Schema validation (form, API, AI contracts) |
| `@types/node` | `^24.19.2` | Type definition cho Node.js 24 |

## 3. Scripts khả dụng trong `web/`

- `npm run dev`: Chạy Next.js Turbopack dev server (port 3000)
- `npm run build`: Build production Next.js
- `npm run start`: Chạy production server
- `npm run lint`: Chạy `eslint . --max-warnings 0`
- `npm run typecheck`: Chạy `tsc --noEmit`
- `npm run test`: Chạy `vitest run`
- `npm run test:watch`: Chạy `vitest` ở chế độ watch

## 4. Kết quả kiểm tra ban đầu (T00)

- `npm run lint`: PASS (0 warnings, 0 errors)
- `npm run typecheck`: PASS (0 errors)
- `npm run test`: PASS (2 tests pass in `tests/unit/smoke.test.ts`)
- `npm run build`: PASS (Biên dịch thành công với Turbopack)
- Khởi tạo thư mục Next.js trong `web/`, không đè tài liệu tại root
- Lockfile `web/package-lock.json` được tạo và kiểm tra toàn vẹn
