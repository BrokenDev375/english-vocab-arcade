# 02 — Kiến trúc và tái sử dụng

## 1. Lựa chọn kiến trúc

Một repository độc lập; một Next.js app trong web/; một Supabase project mới; một Vercel project mới. Không cần monorepo framework, microservices hoặc backend Java cho bản beta.

Đây là quyết định phục vụ bàn giao dễ kiểm soát: code cũ chỉ đọc để trích logic, dự án tiếng Trung tiếp tục hoạt động độc lập. Nếu hai sản phẩm ổn định và cần sửa chung thường xuyên, tách shared package ở phiên bản sau.

~~~mermaid
flowchart LR
  U[Browser: React + Canvas] --> N[Next.js pages và Route Handlers]
  N --> A[Supabase Auth và RLS]
  N --> D[Postgres: sets, sessions, attempts, AI cache]
  N --> G[Gemini API phía server]
  G --> N
  N --> D
  H[GitHub] --> V[Vercel build và deployment]
  V --> N
~~~

## 2. Stack và version

| Vai trò | Lựa chọn |
|---|---|
| Runtime | Node 24.x |
| Web | Next.js 16 ổn định + React tương thích; TypeScript strict |
| Style | Tailwind; component nội bộ, lucide-react |
| Dữ liệu | @supabase/supabase-js, @supabase/ssr |
| Schema | Zod dùng chung ở form, API, AI boundary |
| Game | Canvas 2D + requestAnimationFrame; engine TypeScript thuần |
| Test logic | Vitest |
| Test UI | React Testing Library khi có hành vi cần test |
| E2E | Playwright, Chromium desktop và mobile viewport |
| Database tests | SQL/pgTAP hoặc integration script với anon/user A/user B |
| Import | Parser CSV đúng quote/newline; XLSX chỉ sau kiểm tra package an toàn hiện hành |
| AI | @google/genai ở server; schema output + Zod |

P0 xác minh bản ổn định, tương thích và advisory. Lock phiên bản thực tế trong web/package-lock.json và ghi vào reports/environment.md. Không copy nguyên các versions cũ chỉ vì repo tham khảo đã chạy được.

XLSX trong repo cũ dùng package xlsx 0.18.5; không mặc định tiếp tục dùng bản đó. CSV UTF-8 là đường nhập tối thiểu; bật XLSX khi đã chọn và kiểm tra parser phù hợp. Hoàn thành beta phải có đường import XLSX đã nghiệm thu hoặc ghi rõ blocker trước phát hành, không tự bỏ yêu cầu.

Next.js khuyến nghị chạy linter bằng script riêng; build không thay cho lint. Nguồn: [Next installation](https://nextjs.org/docs/app/getting-started/installation). Node 24.x có trong runtime hỗ trợ của Vercel: [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## 3. Cấu trúc mục tiêu sau bootstrap

~~~text
english-vocab-arcade/
  AGENTS.md, GEMINI.md, PLAN.md, README.md
  docs/
  examples/
  tasks/STATUS.md
  reports/
  .github/workflows/ci.yml
  supabase/
    config.toml
    migrations/
    tests/
    seed.sql                      # Chỉ dev/test, không nhúng account production
  web/
    package.json, package-lock.json
    .env.local                    # Bị gitignore
    .env.example                  # Copy template root, không chứa secret
    src/
      app/
        api/health/route.ts
        api/sets/...
        api/sessions/...
        api/attempts/route.ts
        api/ai/batches/route.ts
        auth/...
        (auth)/...
        (app)/...
      components/
        ui/, layout/, sets/, study/, arcade/
      features/
        sets/
        study/
          question-engine.ts
          answer-normalization.ts
          review-scheduler.ts
        match/
          engine.ts
        arcade/
          engine.ts
          types.ts
          input.ts
          renderer.ts
          constants.ts
          ArcadeCanvas.tsx
        ai/
          schemas.ts
          service.server.ts
          repository.server.ts
      lib/
        supabase/browser.ts
        supabase/server.ts
        supabase/admin.server.ts
        env.server.ts
        auth.server.ts
        errors.ts
      contracts/
      data/demo/                  # Chỉ demo được ghi nhãn
      types/database.generated.ts
      proxy.ts
    tests/unit/
    tests/integration/
    tests/e2e/
    playwright.config.ts
    vitest.config.ts
~~~

Không thêm hai router chồng nhau; không tạo đồng thời src/middleware.ts và src/proxy.ts cho cùng chức năng khi bản Next đã dùng Proxy.

## 4. Ranh giới trách nhiệm

- Server Components: đọc dữ liệu ban đầu, session verification, nội dung không cần tương tác.
- Client Components: form, lựa chọn câu, audio browser, game và input.
- Route Handler: schema, auth, ownership, transaction/RPC, response và error mapping.
- Feature engine: business rules độc lập DOM/Supabase để test deterministic.
- Repository: query select cột rõ; pagination và mapping; không chứa luật UI.
- Admin client: chỉ các thao tác AI quota/cache, RPC ghi attempt đã được server chấm/xác thực và seed vận hành thật sự cần quyền cao. Không dùng cho CRUD thường.
- Database: RLS, integrity, idempotency, transaction. Frontend validation không thay DB constraint.

Nguồn cấu hình auth: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs). Client browser dùng publishable key; server CRUD thường dùng session của user để RLS tiếp tục áp dụng.

## 5. Ma trận tái sử dụng repo tiếng Trung

Nguồn đọc:
D:\Study\personal project\quizzlet clone\quizlet-clone
Commit tham chiếu: 2a1109e83582615364373ebb55176dcfac7f452a
Remote: https://github.com/BrokenDev375/quizlet-clone

| Nguồn | Có thể lấy | Phải chỉnh |
|---|---|---|
| src/lib/quiz/cards-service.ts | Ý tưởng tải phân trang | Generated types, select cột, errors |
| src/lib/quiz/question-generator.ts | Dạng câu hỏi, pool card/type | Đáp án biến thể, distractor không mơ hồ |
| src/app/sets/[id]/match/page.tsx | Shuffle đầu lượt, chặng 6 cặp | Tách engine, persistence, nội dung trùng |
| src/lib/quiz/study-session.ts | Save/resume | User-scoped storage, version, idempotency |
| src/components/QuickImportModal.tsx | Preview/map cột | CSV/XLSX parser, IPA, không pinyin |
| src/lib/quiz/sentence-templates.ts | TTS tiếng Anh và fallback | Voice chọn rõ, không claim audio bản xứ |
| src/app/api/ai/* | Ý tưởng tạo bài theo nhóm | Auth, schema, cache, quota, timeout |
| src/lib/quiz/speech-recognition.ts | Transcript và comparison | Bỏ substring=100%, không giả chấm âm vị |
| Supabase schema cũ | Quan hệ owner/set/card | RLS mới, profiles private, sessions/attempts/AI |

Không sao chép:
- Module translate cố định HSK/Chinese.
- Metadata tên người tạo lên explore.
- Mẫu câu lắp từ bất kỳ rồi quảng cáo là do AI viết.
- Vòng thử 5 models x 2 không có tổng deadline.
- API AI không auth/quota hoặc trả kết quả mà không lưu.
- Cookie/session logic cũ chưa đối chiếu docs mới.
- Public env chứa Gemini key.

## 6. Phương án khi cloud chưa sẵn

Định nghĩa adapter cho đọc bộ và lưu phiên, nhưng đừng tạo abstraction nhiều tầng không cần thiết. Demo fixture chỉ cho UI/engine; persistence thật dùng Supabase. Mỗi màn demo phải có nhãn, không âm thầm rơi sang demo khi Supabase lỗi.

Build production không yêu cầu network đọc database ở build time. Các trang cần user/private data render động, không prerender nội dung riêng tư. Không dùng font tải từ mạng làm điều kiện duy nhất để build thành công; có system font fallback hoặc tự host font hợp lệ.

## 7. Scripts mục tiêu

Trong web/package.json, P0/P2/P11 tạo các scripts thực tế:
~~~json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:db": "node scripts/test-db.mjs",
    "seed:content": "node scripts/seed-content.mjs"
  }
}
~~~

Test integration và seed cần env riêng; khi thiếu env thì báo rõ không chạy, không giả PASS. Không chạy seed production tự động trong build/deploy.
