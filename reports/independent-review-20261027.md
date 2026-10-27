# Kiểm tra độc lập RC1 — English Vocab Arcade

Ngày: 27/10/2026. Source được kiểm tra: **7fd8a1244bfd06693398c8b4bfbc30fb7f1c2fc2**, parent triển khai fbe8f67. Nhánh main sạch trước khi bổ sung hồ sơ review này.

**Kết luận: chưa đủ điều kiện nghiệm thu RC1 để đưa lên production.** Các con số test/build trong báo cáo có thể tái hiện, nhưng chúng không bao phủ một số đường đi thực tế quan trọng. Đã tái hiện được lỗi đọc học phần private qua HTTP và lỗi ghi kết quả cho thẻ ngoài phiên.

## 1. Kiểm tra đã chạy lại

| Kiểm tra | Kết quả độc lập |
|---|---|
| node scripts/check-handoff.mjs | PASS, 42 files tại thời điểm trước review |
| npm run lint | PASS, exit 0 |
| tsc --noEmit --incremental false | PASS, exit 0 |
| npm run test | PASS, 12 files, 97 tests |
| npm run test:integration | PASS, 9 files, 38 tests, Supabase local đang chạy |
| npm run build | PASS, Next 16.4.3; log tạo trang 36/36 |
| HTTP negative checks | FAIL đối với private sessions và card ngoài snapshot |
| AI negative checks với mock provider | Chấp nhận output thiếu card/reading ID sai; báo ready khi finalize bị từ chối |
| E2E browser/mobile thật | Chưa chạy trong đợt review này; repo chưa có Playwright/E2E suite |
| Gemini API thật | Không gọi; không có smoke provider thật được xác minh trong đợt review này |

Build thành công chứng minh source biên dịch được, không chứng minh mọi route đã nối dữ liệu và luồng người dùng hoàn chỉnh. Script handoff chỉ kiểm tra tài liệu/schema mẫu và trạng thái ticket hợp lệ, không xác nhận DONE là đúng.

## 2. Các phát hiện cần sửa

### R01 — P1: API tạo phiên làm lộ toàn bộ thẻ của học phần private

Vị trí: web/src/features/study/sessions.repository.ts:53,83–123; web/src/app/api/sessions/route.ts:48–65. Đường AI có cùng thiếu sót: web/src/app/api/ai/batches/route.ts:36–57.

Repository dùng admin client để đọc set/cards nhưng không kiểm tra owner_id/is_public của set. API chỉ xác thực người gọi, không xác minh quyền đối với setId. RLS bị bỏ qua bởi secret/admin client.

Tái hiện thật với hai tài khoản local mới:
- B đọc cards private A bằng user JWT: 0 row, đúng RLS.
- B GET /api/sets/<private-A>: 404.
- B POST /api/sessions với cùng setId: **201**, response content_snapshot có card private A.

Sửa: đọc metadata/cards bằng user-scoped Supabase client hoặc guard visibility server rõ trước mọi admin read, kể cả resume. AI route phải có cùng kiểm tra, đủ đúng card IDs được yêu cầu. Thêm regression HTTP test B/anon/private/public cho sessions và AI; kiểm tra quyền trước khi cache/quota/provider.

### R02 — P1: Nhiều màn hình vẫn hiển thị demo thay cho học phần thật

Vị trí: web/src/app/explore/page.tsx:22–35; web/src/app/sets/[id]/page.tsx:23–35; web/src/app/sets/[id]/reading/page.tsx:25; web/src/app/sets/[id]/translate/page.tsx:26; web/src/app/sets/[id]/grammar/page.tsx:303.

Explore luôn lọc DEMO_SETS. Detail lấy DEMO_SETS.find(id) hoặc bộ demo đầu tiên; id thật/id không tồn tại vẫn bị thay nội dung. Reading/grammar/translation khởi tạo từ demo exercises, không gọi /api/ai/batches và không gắn nội dung theo bộ đang học. Các trang dictation/speak cũng cần thay nguồn demo.

Tái hiện HTTP: mở URL của bộ riêng B vừa tạo, status 200 nhưng HTML không chứa title của B và chứa title bộ demo đầu tiên.

Sửa: nối repository/API thật; chỉ dùng demo khi DEMO_MODE explicit và có nhãn; lỗi/empty/private không tự chuyển sang demo. Bộ không tồn tại trả notFound. Bài AI phải dựa set, revision và batch đã lưu.

### R03 — P1: UI chưa nối server persistence/resume dù T12–T13 ghi DONE

Vị trí: web/src/app/sets/[id]/learn/page.tsx:39,158–169; web/src/components/study/FlashcardViewer.tsx:30,74; web/src/components/match/MatchGameClient.tsx:222; web/src/components/arcade/ArcadeClient.tsx:87; web/src/features/study/study-client-adapter.ts.

Các component tạo sessionId cục bộ mới và gọi recordLocalAttempt. Không có call site phía UI tới /api/sessions hoặc /api/attempts. Các hàm backup user-scoped đã có nhưng chưa nối các phiên học thực tế; chưa có save queue/reconcile end-to-end. Dashboard đọc stats server trong khi thao tác học chỉ ghi local, nên hai phần không phản ánh cùng hoạt động.

Sửa: tạo/resume UUID session thật, lưu version/snapshot, queue chung cho attempts và saves, đồng bộ sau ack, restore paused và xử lý hai tab. Test trình duyệt học → reload → đóng/mở tab → thiết bị/tài khoản khác; xác minh cả DB và UI.

### R04 — P2: Local progress không tách user và không được xóa bởi logout cleanup

Vị trí: web/src/features/study/study-client-adapter.ts:112–126,137–150,171–199.

recordLocalAttempt dùng eva_study_attempts_<sessionId>; progress dùng eva_study_progress_<setId>, không có user ID. clearUserLocalData chỉ xóa prefix eva:v1:<userId>:. Vì vậy user khác trên cùng browser có thể kế thừa tiến độ cục bộ của set đó; logout cleanup không chạm các key thực tế đang dùng.

Tái hiện bằng in-memory localStorage: sau ghi một attempt rồi clearUserLocalData(A), hai key eva_study_* vẫn còn và getLocalSessionAttempts vẫn trả 1 attempt.

Sửa: một chuẩn key duy nhất có userId/guest, schema version và set/mode/session; kiểm tra restore thuộc đúng user; gọi cleanup thật từ logout UI. Có migration/xử lý key cũ, không gộp dữ liệu A/B.

### R05 — P1: Bộ lớn bị cắt ở 500 thẻ trên UI và có thể ở 1.000 trong session snapshot

Vị trí: web/src/app/sets/[id]/learn/page.tsx:79–81, arcade/page.tsx:36–38; tương tự flashcards/match/test/edit. Server snapshot: web/src/features/study/sessions.repository.ts:93–103.

UI chỉ gọi cards?limit=500 một lần và không duyệt meta.nextCursor. Snapshot query không range/pagination, phụ thuộc max rows mặc định của Supabase. Test đọc 1.001 thẻ ở repository không chứng minh UI đã tải đủ.

Sửa: shared pagination loader, stable cursor/revision; snapshot phải lấy đủ trong giới hạn công bố và kiểm tra kích thước. Thêm case thật bộ 1.001 thẻ: UI báo đủ, chặng đi hết đủ ID, không mất phần đuôi.

### R06 — P2: Server chấp nhận game_hit cho card ngoài session và cộng progress

Vị trí: web/src/features/study/sessions.repository.ts:253–300; supabase/migrations/20261026000003_study.sql:255–267.

attemptKind=game_hit tự đặt isCorrect=true, không kiểm tra card thuộc snapshot hoặc question/mode hợp lệ. Normal answers chỉ so term, chưa chấm theo dạng câu hỏi thực tế. RPC kiểm tra session owner/version nhưng không membership question/card và trạng thái terminal trước khi ghi.

Tái hiện HTTP: session learn của B chỉ có card B; POST game_hit với card private A và answer sai vẫn trả **200, isCorrect=true**, tạo study_progress cho B/card A với correct_count=1.

Sửa: validate session mode/status, card/question membership và đáp án của loại bài; game typing/hinted recall không tăng mastery như independent recall. RPC cũng bảo vệ invariant. Thêm negative tests, không chỉ happy path/idempotency.

### R07 — P1: AI báo ready dù kết quả chưa được lưu thành công

Vị trí: web/src/features/ai/ai.repository.ts:212–227.

Lệnh finalize_ai_batch_v1 được await nhưng bỏ qua cả error lẫn data.success. Khi mất lease hoặc DB từ chối ghi, API vẫn trả ready/output, trái yêu cầu refresh dùng lại batch đã lưu.

Tái hiện bằng mock RPC: reserve nhận lease, finalize trả success=false/INVALID_LEASE; repository vẫn trả status=ready.

Sửa: chỉ trả ready sau finalize thành công hoặc đọc lại ready batch thực sự đã lưu. Kiểm tra cả transport error và structured failure; giữ idempotency/lease khi retry. Test lỗi DB và invalid/expired lease.

### R08 — P2: Validation AI chưa kiểm tra đủ thẻ và không chặn ID sai ở Reading

Vị trí: web/src/features/ai/service.server.ts:258–287; web/src/features/ai/schemas.ts:12–14,47–54.

Context/grammar/translation chỉ kiểm tra ID trả về nằm trong expected set; không kiểm tra coverage/duplicate. Reading trả parsed luôn, không đối chiếu usedCardIds. Ngoài ra schema chưa chứng minh unique options, targetSurface nằm trong câu hoặc word count theo level.

Tái hiện với mock provider: yêu cầu 2 cards nhưng trả 1 context được success=true; Reading dùng UUID ngoài input cũng success=true. Do đó báo cáo từ chối hallucinated card ID chưa đúng cho mọi mode.

Sửa: unique + exact coverage cho các mode 1 item/card; Reading subset hợp lệ, min coverage theo contract; constraints ngữ cảnh/token/options/word count. Tests phải có missing/duplicate/unknown IDs.

### R09 — P2: AI kill switch và budget provider toàn project chưa được enforce

Vị trí: web/src/lib/env.server.ts:11; web/src/features/ai/service.server.ts:311–343; supabase/migrations/20261026000004_ai.sql:146–183.

AI_ENABLED được parse nhưng generation không kiểm tra nó. Fallback hard-code gemini-1.5-flash thay vì biến cấu hình đã xác minh. reserved_calls tạo bằng 0 và không được tăng ở mỗi provider call; không có enforce global project 50 calls/day. Failed/expired batch takeover bỏ qua đoạn quota/rate check phía dưới. Test 5 batches/user và 2 ops/phút không bao phủ các điều này.

Sửa: feature gate trước reserve/provider; cấu hình fallback có verify; reserve provider budget theo từng attempt/retry và project scope atomic; áp policy takeover/retry rõ. Chưa có bằng chứng API Gemini thật được smoke, không ghi VERIFIED chỉ từ mock tests.

### R10 — P2: Auth chưa đủ luồng theo kế hoạch

Vị trí: web/src/app/api/auth/confirm/route.ts:12; docs/08-deployment-runbook.md phần Auth.

/forgot-password và /reset-password chưa có trang/flow; recovery handler lại redirect tới /reset-password. Request HTTP tới hai route đều 404. Các callback hiện ở /api/auth/* trong khi runbook mô tả /auth/*; hai URL theo runbook cũng 404. Không có Proxy/middleware refresh theo đặc tả SSR.

Sửa: hoàn thiện forgot/reset, thống nhất actual routes + Auth URL/template/runbook; kiểm tra cookie refresh và email thật. Test getUser với SDK riêng không tương đương test signup/email/callback trình duyệt.

### R11 — P2: CI và bằng chứng UI chưa đáp ứng T19/G0–G4

Vị trí: .github/workflows/ci.yml:26–60; web/package.json; web/tests/integration/study-flow.test.ts.

Workflow chỉ chạy handoff/lint/typecheck/unit/build, không start Supabase hoặc chạy integration tests. Chưa có Playwright dependency/config/tests/e2e hay script test:e2e/test:db. Một số test được gắn E03 chạy Node environment và bỏ qua assertion localStorage khi window không tồn tại; không phải E2E UI. Regex secret scan chỉ nhắm dạng Gemini key, chưa là kiểm toán mọi loại secret.

Sửa: CI job DB + migrations + integration, E2E browser cho các hành trình thực, báo cáo mobile thủ công tách biệt. Handoff checker không được dùng như bằng chứng mọi ticket đã nghiệm thu. Không có căn cứ từ source hiện tại để khẳng định 100% UI/mobile đã được nghiệm thu.

### R12 — P2: T18 chưa đạt phạm vi học liệu beta và review chưa có bằng chứng độc lập

Vị trí: docs/09-work-breakdown.md:170–175; docs/01-product-and-ux.md:122; web/tests/unit/dataset-manifest.test.ts:21,47; reports/content-review.md.

Kế hoạch yêu cầu 30 cards cho smoke và >=300 reviewed cards cho public beta. Dataset hiện có 32; test lại chỉ yêu cầu >=30. Hash, field reviewer và regex /.../ cho IPA không kiểm chứng phiên âm/CEFR/ngữ nghĩa. Báo cáo gán tên Editorial Team/Curriculum Lead nhưng chưa cung cấp hồ sơ kiểm duyệt độc lập.

Sửa: ghi đúng smoke/internal dataset; mở rộng theo cổng 300 nếu phát hành beta đầy đủ, hoặc xin thay đổi phạm vi rõ. Review nội dung cần người/nguồn và evidence thật; không suy ra độ chính xác 100% từ metadata do code tự khai.

### R13 — P2: Sự kiện bắn trúng từ input không đi qua đường ghi attempt

Vị trí: web/src/components/arcade/ArcadeClient.tsx:147–194,197–217.

recordLocalAttempt(TARGET_HIT) chỉ đặt trong handleStep. Nhưng hit được tạo bởi consumeText ở handleInputChange; đường này chỉ setLastEvents/xử lý WRONG_KEY, không gọi hàm ghi attempt/hit sound. Vì vậy hit có điểm trên engine/visual nhưng không theo cùng pipeline ghi kết quả như miss.

Sửa: một event dispatcher chung cho step/consumeText và các input composition, dùng event ID của engine; không tạo side effects trong React state updater có thể chạy lại. Test một hit/miss chỉ ghi đúng một lần từ UI.

## 3. Đề nghị điều chỉnh trạng thái

- T00: các checks build/type/unit đã được tái hiện.
- T02–T03: có tests database thật đạt, nhưng không suy rộng sang phân quyền API an toàn.
- T04–T05: chưa nghiệm thu end-to-end do Auth thiếu và UI demo.
- T08/T11–T13/T16–T17: cần nối dữ liệu/persistence thực và UI tests trước DONE.
- T14–T15: cần xử lý các negative cases/cache commit/quota; provider thật giữ UNVERIFIED khi chưa smoke.
- T18: chưa đủ scope beta; không coi 32 cards tự khai reviewed là hoàn thành 300.
- T19: chưa đủ CI/E2E/security evidence cho toàn bộ G0–G4.
- T20/T21 BLOCKED và T22 UNVERIFIED là phù hợp với hiện trạng chưa có cloud production.

Không thay bảng trạng thái lịch sử của agent trong review này; thêm ghi chú kết luận độc lập để chủ dự án quyết định và giao sửa theo R01–R13.

## 4. Thứ tự sửa đề xuất

1. R01/R06: đóng bypass admin, bảo vệ membership/grades; thêm negative HTTP tests.
2. R02/R03/R04/R05: nối học phần thật, pagination và persistence user-scoped; kiểm tra từ UI đến DB.
3. R07/R08/R09/R13: hoàn thiện AI/event pipeline và các failure/concurrency cases.
4. R10/R11/R12: Auth đủ, CI/E2E và học liệu đúng scope; sửa báo cáo theo evidence thật.
5. Chỉ tiếp tục nghiệm thu production sau các blocker P1 và regression tests đã qua.

## 5. Phạm vi và dọn dữ liệu

Kiểm tra chỉ trên source/local Supabase. Không truy cập dữ liệu production, không gọi Gemini thật. Hai tài khoản và dữ liệu synthetic riêng được tạo cho HTTP probes đã được xóa. Server Next tạm port 3197 đã được dừng; kiểm tra riêng xác nhận 0 listener và 0 process của server kiểm tra.

Các probes Node dùng mock provider/RPC để kiểm tra failure semantics không thay thế kiểm thử browser. Browser/mobile thật và provider network thật chưa được chạy trong review này. Không tuyên bố toàn bộ source không còn lỗi ngoài các đường đã xem.

Chi tiết kết quả máy đọc được: [evidence JSON](independent-review-20261027-evidence.json).
