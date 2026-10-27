# 09 — Ticket triển khai cho Gemini

Các ticket đi theo phụ thuộc; một ticket chỉ DONE khi có bằng chứng. Không tự gộp mọi ticket thành một lần tạo source khổng lồ rồi bỏ kiểm tra.

## T00 — Xác minh và bootstrap (P0)

Đọc AGENTS.md, PLAN.md, docs/02 và docs/08.
- Kiểm tra đúng root English Vocab Arcade; không tạo app vào một dự án khác.
- Kiểm tra Node/npm/Git/Docker và quyền tài khoản hiện có.
- Đọc docs Next/Supabase hiện hành, chọn Next 16 stable patched và React tương thích; pin bằng lockfile.
- Tạo Next app trong web/ với TypeScript, App Router, src/, Tailwind, ESLint, alias @/*.
- Dùng create-next-app trong web/ trống; nếu web/ đã có file, inspect và tiếp tục chứ không xóa.
- Tạo scripts lint/typecheck/test/build; cài Vitest và schema library.
- Node engines=24.x; ghi môi trường thật vào reports/environment.md.
DONE: trang shell chạy, lint/typecheck/test smoke/build pass. Chưa cần cloud key; không fake kết nối database.

## T01 — Layout và trạng thái UI (P1)

Files: web/src/app/layout.tsx, components/ui, components/layout, routes placeholder có nhãn.
- Điều hướng homepage/explore/dashboard, tiếng Việt nhất quán.
- Chọn màu/typography, form/error/empty/loading/focus.
- Tạo mock demo 20 cards dùng riêng khi DEMO_MODE=true.
- Không đọc private data ở build time; dùng server/client boundary rõ.
DONE: 360/768/1440 px không vỡ layout; placeholder không được quảng cáo đã tích hợp.

## T02 — Schema core và RLS (P2)

Files: supabase/migrations/*core*, *auth_and_rls*, supabase/tests.
- Viết profiles, learning_sets, vocabulary_cards; check/FK/index.
- Profile trigger, immutable owner, card revision.
- RLS theo docs/03; profiles chỉ own-user.
- Test A/B/anon và generate types.
DONE: local DB mới apply được; D01–D04/D12/D14/D15 pass. Không dùng admin key để chứng minh RLS.

## T03 — Study/AI database contracts (P2)

Files: migrations/*study*, *ai*, repository types.
- Thêm sessions, attempts, progress, AI cache/budget/idempotency.
- Unique active session, optimistic version, duplicate event transaction.
- Privileged RPC chỉ server role, khóa quota atomic.
- Test race và không cho client direct write attempt/quota.
DONE: D05–D11/D16 pass; types không dùng any để né schema.

## T04 — Auth SSR (P3)

Files: lib/supabase/browser.ts, server.ts, admin.server.ts, src/proxy.ts, auth routes.
- Follow SSR guide của version thực tế.
- Signup/confirm/login/forgot/reset/logout với cookie.
- Verify identity server; safe next redirect.
- Lazy env validation theo feature để build shell được khi AI chưa cấu hình.
DONE: E01 local pass, private routes không được truy cập bằng session giả; client bundle không có secret.

## T05 — Set/card CRUD và explore (P4)

Files: features/sets, API sets/cards, dashboard, explore, editor.
- Select metadata rõ và không JOIN profile trên explore.
- Đọc public/private đúng; owner CRUD đúng.
- Pagination cursor của cards, cap 5.000 và revision guard.
- Không delete-all/reinsert khi edit.
DONE: E02 và GET 1.001 cards pass; B không chỉnh A; explore không có author block.

## T06 — CSV/XLSX import và seed tools (P4)

Files: components/import, features/sets/import, scripts/seed-content.mjs.
- Chọn parser hiện hành đã kiểm tra, không bê xlsx 0.18.5 mù quáng.
- Preview/map column, validate, row errors; limit file/row/body.
- Chunk 100, import_key deterministic, partial resume.
- Seed namespace có manifest; không seed prod trong build.
DONE: quoted CSV, newline/Unicode, duplicate retry và partial failure pass; cả CSV/XLSX được test hoặc blocker XLSX ghi rõ.

## T07 — Normalize và question engine (P5)

Files: features/study/answer-normalization.ts, question-engine.ts, review-scheduler.ts.
- Chuẩn hóa English, accepted variants, token boundaries.
- Pool card/type unique, distractors khác nghĩa/không trùng.
- Ít thẻ có fallback hợp lệ, không tạo options giả.
- Lịch due theo docs/01.
DONE: U01/U04–U08/U18 pass; engine không import React/Supabase.

## T08 — Flashcard, Learn/Test, review (P5)

Files: study UI routes, attempts client adapter, progress views.
- Tách lượt chính và lượt ôn lỗi có chủ đích.
- Test có kết quả/đáp án; số câu không vượt pool.
- Self rating không ghi như answer đúng.
- UI nối persistence contract; khi T12 chưa xong phải ghi nhãn trạng thái đó.
DONE: hành vi E03 pass và các answer có event identity ổn định.

## T09 — Match engine/UI (P6)

Files: features/match/engine.ts, match page.
- Fisher–Yates một lần, 6 cặp/chặng.
- Xử lý trùng text tránh ghép đúng nội dung nhưng bị báo sai.
- Timer cộng active time, pause giữa chặng.
- Đủ lượt mới replay.
DONE: 20 cards=6+6+6+2, 1 card và empty đúng; U02/U03 pass.

## T10 — Arcade engine thuần (P7)

Files: features/arcade/types.ts, constants.ts, engine.ts, input.ts.
- Implement đúng state/events/constants của docs/05.
- Deck một lần, spawn cursor, target conflict scheduling.
- Lock/variants/backspace/escape/hints/hit/miss/terminal priority.
- Injectable seed và clock, serialization.
DONE: U09–U15 pass với nhiều kích thước, chưa cần Canvas đẹp.

## T11 — Arcade renderer/input/mobile (P7)

Files: ArcadeCanvas.tsx, renderer.ts, arcade route/HUD/result.
- Canvas+React overlay, rAF cleanup, reduced motion.
- HTML input bridge, IME dedupe, native keyboard, resize.
- Pause visibility; không tick mạng; âm thanh sau gesture.
- Kết quả có review missed và chưa gặp khi thua sớm.
DONE: E04/E05, frame-gap/pause/memory cleanup pass; mobile native test có bằng chứng hoặc ghi UNVERIFIED.

## T12 — Persistence và chống ghi trùng (P8)

Files: API sessions/attempts/progress; repositories; local backup queue.
- Grader server đọc snapshot; không nhận target/isCorrect từ client làm sự thật.
- Atomic record_attempt_v1 và progress; idempotency.
- Save queue, version conflicts, user-scoped localStorage.
- Resume paused, không tính thời gian offline, không hồi sinh terminal.
DONE: E06 + D08–D10; refresh 10 lần không tăng attempt count; hai tab không ghi đè.

## T13 — Thống kê học và lịch sử (P8)

Files: dashboard/review/settings; stats repository.
- Sessions, attempts, due và streak theo timezone user.
- Không dùng Gemini usage làm học tập.
- Chỉ số thời lượng loại paused/hidden, không cộng retry.
DONE: số liệu suy ra được từ fixture events; A/B tách hoàn toàn.

## T14 — Gemini provider adapter (P9)

Files: features/ai/service.server.ts, schemas.ts, env.server.ts.
- Verify model IDs, SDK parameter và structured output.
- Deadline tổng, tối đa 2 calls, xử lý 400/401/403/429/timeout.
- Zod validate và cardId mapping.
- Mock provider/clock tests; smoke thật có quota kiểm soát.
DONE: invalid output không thành ready, module không vào client; reports/provider-check.md có trạng thái thật.

## T15 — Persistent cache và quota (P9)

Files: AI repository/server RPC, API ai/batches.
- Hash toàn input semantic/revision/level/version/nonce.
- Lease owner token, idempotency, daily/minute budgets.
- Cache hit không gọi provider; pending không sinh job trùng.
- Poll status bounded; không fire-and-forget.
DONE: E07, cache race và quota concurrent pass; process timeout không để pending vô hạn.

## T16 — English exercises (P10)

Files: grammar/reading/translate routes và components.
- Dùng contracts context/grammar/reading/translation.
- Bỏ mọi HSK/pinyin/Chinese labels khỏi luồng này.
- Grammar tokens tự shuffle, punctuation đúng.
- Reading chấm closed key; translation phân biệt exact reference và câu chưa khớp.
- Reload dùng batch cũ, edit card tạo revision mới.
DONE: English end-to-end; không dùng edit distance để khẳng định sai ngữ pháp.

## T17 — Dictation/speaking (P10)

Files: audio/speech adapter, dictation/speak routes.
- English voice selection, gesture/autoplay/mute/fallback.
- Exact token comparison, không substring=100%.
- Xin quyền mic đúng lúc; không lưu raw audio mặc định.
- Nhãn phản hồi đúng giới hạn transcript.
DONE: E08 pass trên môi trường hỗ trợ; trường hợp không hỗ trợ vẫn học được.

## T18 — Học liệu và kiểm duyệt (song song P4–P11)

Files: content manifest, seed dataset, reports/content-review.md.
- 30 cards sạch cho smoke trước; mở rộng >=300 cho public beta.
- Từ loại, nghĩa, IPA, ví dụ và accepted answers được kiểm tra.
- Không copy kho Parroto hoặc nguồn không cho phép.
- Level là mục tiêu biên tập; ghi reviewer/date/status thật.
DONE: manifest đếm được reviewed/draft; không coi 10 mẫu trong examples là hoàn tất.

## T19 — Quality/CI/security (P11)

Files: workflows, test suites, reports/phase-P11.md.
- Chạy unit/integration/RLS/E2E.
- Tests không gọi provider thật trong CI.
- No secret scan, no author on explore, no foreign user progress.
- Accessibility, mobile và no infinite loading.
DONE: G0–G4 pass; lỗi blocker đã sửa; chưa chạy không đánh PASS.

## T20 — Production Supabase (P12)

Đi theo docs/08 bước 4–6.
- Xác minh project mới, migration dry-run rồi push, không reset remote.
- Configure Auth URLs/email, publisher và nội dung.
- Kiểm tra A/B/anon trên project thật với tài khoản test.
DONE: ghi project ref không secret, migration list, auth/RLS smoke evidence.

## T21 — GitHub và Vercel (P12)

Đi theo docs/08 bước 7–9.
- Repository mới, root web, env đúng scope, main production.
- CI pass, Vercel Ready, commit SHA đối chiếu /api/health.
- Preview demo được ghi rõ nếu không có staging DB.
DONE: GitHub hash và stable URL thật có bằng chứng; không chỉ link preview hoặc log push.

## T22 — Production smoke và bàn giao (P12–P13)

- Đi hết checklist production; check cache bằng provider call count.
- Kiểm tra giao diện mới từ URL thật trong tab mới.
- Điền templates/release-checklist.md vào reports/release-v1.md.
- README có cách chạy, deploy và giới hạn; STATUS mọi ticket đúng thực tế.
DONE: G5 pass, owner có URL/hash và runbook; không còn TODO trong chức năng bắt buộc.

## Cách xử lý blocker

Blocker phải có: ticket, điều kiện thiếu, lệnh/lỗi đã thấy, ai cần làm gì và phần local còn có thể tiếp tục.
Không ghi thiếu Supabase rồi ngừng mọi việc; T01/T07/T09/T10/T11 vẫn làm được.
Không bịa Supabase URL, API key hoặc model name để qua env validation.
Không bỏ test RLS vì UI đã nhìn đúng.
