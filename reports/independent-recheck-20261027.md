# Tái kiểm tra độc lập bản sửa R01–R13 — 27/10/2026

Source được kiểm tra: `abb35fa` (`fix: resolve all independent review findings (R01-R13)`). Đối chiếu báo cáo lần đầu tại [independent-review-20261027.md](independent-review-20261027.md).

**Chưa đủ điều kiện nghiệm thu bản sửa hoặc triển khai production.** Test ở tầng hàm/database pass, nhưng production build hiện FAIL và một số luồng UI/persistence vẫn chưa hoàn thành. Dòng `npm run build (exit 0 - 42 routes)` trong `tasks/STATUS.md:711` không tái hiện được trên commit này.

## 1. Các kiểm tra thực sự đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| `node scripts/check-handoff.mjs` | PASS; 44 files, 23 tickets, 14 phases, 10 sample cards |
| `npm run lint` | PASS |
| `tsc --noEmit --incremental false` (binary của dự án) | PASS |
| `npm run test` | PASS; 101 tests / 12 files |
| `npm run test:integration` | PASS; 43 tests / 9 files, Supabase local thật |
| `npm run build` | **FAIL; exit 1; Proxy is missing expected function export name** |
| Probes bổ sung | Hàm client với fetch/localStorage giả lập; repository/RPC với Supabase local thật; provider/RPC lỗi giả lập; GNU grep thật |
| Browser E2E, HTTP routes từ production build mới | **Chưa chạy** vì build mới bị lỗi; không dùng build cũ để tuyên bố bản sửa đã pass |
| Gemini thật, GitHub Actions remote, Vercel production | Chưa xác minh trong lần review này |

Khi bắt đầu, working tree sạch và `main` ahead `origin/main` 1 commit. Review không push, deploy hoặc sửa mã ứng dụng/migration. Dữ liệu thử gồm hai user và 1.001 thẻ synthetic mỗi lượt probe; đã dọn user, dữ liệu phụ thuộc và quota/rate bucket của các fixture. Không gọi Gemini thật. Chi tiết: [evidence JSON](independent-recheck-20261027-evidence.json).

## 2. Các lỗi cần sửa tiếp, theo thứ tự ưu tiên

### F01 — P1: Bản sửa làm production build thất bại

Vị trí: `web/src/proxy.ts:4`.

File tên `proxy.ts` nhưng export `middleware`. Next 16 đang cài yêu cầu default export hoặc named export `proxy`. `npm run build` dừng với `Proxy is missing expected function export name`. Quy ước được đối chiếu với tài liệu local `web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`, mục Exports.

Sửa: xuất đúng hàm proxy, chạy lại build thật từ commit sửa, sau đó mới kiểm tra login/refresh/recovery và các route mới. Không đóng R10 chỉ vì đã tạo đủ file.

### F02 — P1: R03 mới gửi attempts, chưa lưu/khôi phục một phiên học đầy đủ

Vị trí: `web/src/features/study/study-client-adapter.ts:246–319`; `web/src/app/sets/[id]/learn/page.tsx:48–59,125–129,167–198`; `web/src/app/sets/[id]/test/page.tsx:154`; `web/src/features/study/sessions.repository.ts` đoạn gọi `record_attempt_v1`; `supabase/migrations/20261026000003_study.sql:336–350`.

- `initServerSession` chỉ trả `sessionId/version`, bỏ `state`, `seed`, snapshot và thứ tự câu hỏi. Probe trả state `currentIndex=8` từ server nhưng adapter chỉ còn ID/version. Learn vẫn tạo kế hoạch mới từ đầu; không có luồng khôi phục cursor/chặng.
- UI chưa gọi đường save session/PATCH hoặc local backup/restore đã có. Repository ghi attempt không gửi `p_next_state`. Sau hai attempt hợp lệ, DB vẫn có `stageIndex=0`, `active_elapsed_ms=0`, `status=active`, `state_version=1`. Cả hai attempt cùng version vẫn được ghi: không kết luận có xung đột chỉ từ việc gửi đồng thời.
- Test, grammar, translation vẫn chỉ gọi local recorder; reading chưa nối pipeline attempt server. Các mode đã nối cũng bắt đầu cho tương tác trước khi init server xong; attempt lúc đó không được gửi bù.
- `sendServerAttempt` trả `null` khi HTTP503, không có queue gửi lại/đối soát trạng thái đồng bộ; UI tiếp tục đi tiếp. Probe HTTP503 xác nhận kết quả `null`.

Sửa: dựng adapter phiên thật cho từng mode, dùng snapshot/seed/cursor server, lưu trạng thái khi chuyển câu/chặng/pause/completed và phục hồi khi reload. Dùng cùng `clientEventId` trong local/server, có pending queue user-scoped và retry lỗi tạm thời. Kiểm tra từ UI đến DB: trả lời, reload, tiếp tục đúng câu; chơi xong có completed; gián đoạn mạng rồi kết nối lại không mất hoặc nhân đôi attempt.

### F03 — P1: R05 còn cắt thẻ ở Arcade và trang chi tiết; helper nuốt lỗi giữa chừng

Vị trí: `web/src/app/sets/[id]/arcade/page.tsx:38`; `web/src/app/sets/[id]/page.tsx:99–104`; `web/src/features/sets/sets-client.ts:55,99–103`.

Arcade vẫn fetch một lần `cards?limit=500`, không dùng pagination helper, nên bộ 501+ thẻ vẫn không được chơi hết. Trang chi tiết query cards một lần không range/cursor nên còn giới hạn mặc định 1.000 của Supabase local. Snapshot repository đã sửa và probe xác nhận có đủ 1.001 thẻ; điều đó không chứng minh UI nhận đủ.

Helper mới có `if (!res.ok) break` và catch rồi trả `allCards`. Probe trang 1 có 1 card/nextCursor, trang 2 HTTP500: hàm trả 1 card bình thường, không báo lỗi. Khi áp dụng helper vào Arcade phải sửa luôn việc trả bộ dữ liệu thiếu như thành công.

Sửa: phân trang đủ ở mọi nơi cần toàn bộ tập thẻ, xử lý lỗi/retry rõ ràng. Kiểm tra bộ 501 và 1.001+ thẻ từ UI; lỗi trang 2 phải hiển thị retry thay vì bắt đầu học bộ bị cắt.

### F04 — P2: R04 đã đổi format key nhưng UI vẫn ghi chung vào guest, logout chưa gọi cleanup

Vị trí: `web/src/features/study/study-client-adapter.ts:126,150–153,226–238`; các call site `recordLocalAttempt` ở Learn/Flashcards/Match/Arcade/Test/Grammar/Translate/Dictation/Speak; `web/src/app/api/auth/logout/route.ts`.

Các caller không truyền `userId` hoặc argument thứ hai nên vẫn dùng mặc định `guest`, kể cả người đã đăng nhập. `clearUserLocalData` chỉ có định nghĩa, không có call site trong ứng dụng. Logout server không thể tự xóa localStorage.

Probe: ghi đúng user A rồi cleanup A thì sạch; gọi theo cách UI đang dùng rồi cleanup A vẫn còn `eva:v1:guest:attempts:...` và `eva:v1:guest:progress:...`. Vì vậy test helper A/B mới pass chưa chứng minh UI phân lập tài khoản. Legacy read fallback cũng chưa phân biệt chủ dữ liệu.

Sửa: truyền identity thật từ auth client vào toàn bộ persistence/queue, gọi cleanup trong logout/account switch, xác định cách bỏ hoặc migrate legacy keys an toàn. Kiểm tra A học rồi logout, B đăng nhập cùng trình duyệt không đọc/ghi chung progress A.

### F05 — P2: R09 chưa bảo vệ quota khi retry/takeover và chưa có budget provider toàn cục

Vị trí: `supabase/migrations/20261026000004_ai.sql:146–162,182`; `web/src/features/ai/service.server.ts` phần gọi provider.

Nhánh batch failed/lease expired cấp lease mới trước quota/rate checks. Probe DB thật: `daily_limit=1`, `minute_limit=1`, cùng batch được reserve rồi finalize failed bốn lần liên tiếp; cả bốn lần đều `lease_acquired`, `reserved_operations=1`, `reserved_calls=0`. `retry_after` được ghi nhưng không ngăn nhánh failed takeover ngay.

Trong lượt chạy thật, lease acquired dẫn tới gọi provider. Kill switch đã có, nhưng nó không thay thế rate limit/cooldown khi thất bại hoặc giới hạn số provider calls của mọi user. Không có migration mới trong commit sửa và không thấy đường tăng/kiểm tra `reserved_calls`.

Sửa: migration bổ sung, enforce cooldown/rate/budget atomically cho mỗi provider attempt, kể cả fallback/takeover. Phân biệt quota logical batch với số calls thực. Test retry failed và nhiều user không vượt ngân sách chung; chưa xác minh provider/fallback thật chỉ bằng mock.

### F06 — P2: R13 đã nối hit vào dispatcher nhưng chưa đảm bảo ghi đúng một lần

Vị trí: `web/src/components/arcade/ArcadeClient.tsx:166–230,242–272`.

`processEvents` phát âm thanh, ghi local và gọi HTTP ngay bên trong functional updater của React. Updater có thể được chạy lại trong Strict Mode/replay; mỗi lần dispatcher lại tạo UUID mới, bỏ qua `evt.id`, và local/server còn dùng hai UUID khác nhau.

Probe tách nguyên callback bằng TypeScript AST rồi phát lại cùng một event engine có ID ổn định: một event tạo 2 record với 2 ID khác nhau và phát âm thanh 2 lần. Đây là probe replay callback, chưa phải browser Strict Mode E2E.

Sửa: giữ updater thuần, dispatch effects ngoài updater, dedupe theo engine event ID ổn định và dùng cùng ID cho local/server. Test UI dưới Strict Mode và retry một hit/miss chỉ có đúng một record.

### F07 — P2: R11 thêm integration CI nhưng private-key scan đang pass khi scanner bị lỗi

Vị trí: `.github/workflows/ci.yml:32`.

Pattern `-----BEGIN ...` được truyền thẳng sau `grep -rE`, thiếu `-e` hoặc `--`. GNU grep hiểu đó là option, trả exit 2; toán tử `!` biến thành thành công. Probe với private-key header synthetic xác nhận exit 2, tức check bỏ qua cả khi có header cần chặn.

Sửa: truyền pattern đúng cú pháp, xử lý exit 0/1/2 riêng để scanner error làm CI fail; không in secret thật ra log. Test synthetic key bị chặn, file sạch pass, scanner error fail. Integration đã thêm vào workflow nhưng chưa chạy workflow remote; vẫn chưa có browser E2E cho CRUD→học→reload/game/persistence.

### F08 — P2: R02/R12 còn luồng demo và báo cáo nghiệm thu chưa thống nhất

Vị trí: `web/src/app/dashboard/page.tsx:190`; `web/src/app/sets/[id]/arcade/page.tsx:43,89–92`; `web/src/app/sets/[id]/reading/page.tsx:83–96`; `reports/content-review.md`; `tasks/STATUS.md:711–731`.

Dashboard vẫn liệt kê `DEMO_SETS`. Arcade vẫn thay lỗi/không có cards của set thật bằng `DEMO_CARDS`, metadata lỗi dùng demo đầu tiên. Reading/grammar/translation đã gọi AI nhưng khi API trả pending/202 thì chuyển sang bài mẫu với notice, chưa poll để nhận batch cho học phần thật. Có tiến bộ ở Explorer/detail, nhưng chưa thể nói đã loại toàn bộ dữ liệu mẫu ngụy trang lỗi.

Tài liệu content-review đã sửa thành 32 thẻ cho internal/smoke và ghi public beta cần >=300. Đó là sửa báo cáo, chưa hoàn thành học liệu theo scope beta. Trạng thái T18/DONE và kế hoạch đi thẳng lên cloud cần phản ánh điều kiện còn thiếu. Không coi tự gắn reviewer trong metadata là bằng chứng kiểm duyệt nội dung.

Sửa: dashboard dùng dữ liệu user, lỗi set thật hiện lỗi/retry, pending AI dùng polling có deadline/cancel. Thống nhất STATUS/release report với scope học liệu và các kiểm tra hiện còn FAIL/UNVERIFIED.

## 3. Đối chiếu 13 phát hiện cũ

| Mục cũ | Kết quả tái kiểm tra |
| --- | --- |
| R01 | Đã chặn đường tạo phiên mới cho set private của người khác ở repository; AI route có visibility check. HTTP mới chưa retest do build lỗi. Nhánh resume còn trả snapshot cũ trước visibility check; cần xác định rõ chính sách khi học phần đổi quyền. |
| R02 | PARTIAL — Explorer/detail/advanced đã nối API; dashboard/Arcade và pending AI còn thiếu, xem F08. |
| R03 | PARTIAL — attempts ở một số mode đã lên server, chưa có resume/save đầy đủ, xem F02. |
| R04 | PARTIAL — helper đúng khi có identity, UI chưa truyền và chưa gọi cleanup, xem F04. |
| R05 | PARTIAL — server snapshot 1.001 cards pass; UI/Arcade và failure pagination còn lỗi, xem F03. |
| R06 | Các probe cũ đã bị từ chối: outside-card → INVALID_CARD_MEMBERSHIP, wrong game_hit → INVALID_ANSWER, terminal session → SESSION_TERMINATED. |
| R07 | Probe finalize reject đã trả failed/INVALID_LEASE; không còn false ready. |
| R08 | Probe context thiếu card và reading ID bịa đều bị từ chối; unit test bổ sung pass. Chưa suy ra chất lượng ngôn ngữ/provider thật. |
| R09 | PARTIAL — AI_DISABLED pass, fallback cấu hình được; quota/budget vẫn thiếu, xem F05. |
| R10 | Chưa đóng — có file auth mới, proxy làm build FAIL; luồng browser recovery/refresh chưa nghiệm thu, xem F01. |
| R11 | PARTIAL — có integration trong CI, scan lỗi và thiếu E2E, xem F07. |
| R12 | PARTIAL — đã đính chính scope 32 cards internal, chưa hoàn thành >=300 cards beta, xem F08. |
| R13 | PARTIAL — input hit đã đi qua dispatcher, replay/effects/ID chưa đúng, xem F06. |

## 4. Thứ tự sửa và bằng chứng cần nộp

1. Sửa F01, nộp log build thành công gắn đúng commit. Sau đó chạy HTTP/browser tests trên build mới.
2. Sửa F02–F04: luồng dữ liệu thật, full pagination, resume và user isolation. Nộp UI→API→DB evidence, gồm refresh/logout/network failure.
3. Sửa F05–F07: DB quota/cooldown, stable event IDs, CI scanner và browser regressions.
4. Sửa F08 và báo cáo; giữ provider/cloud/content chưa xác minh ở trạng thái phù hợp. Chỉ nghiệm thu deploy sau khi các blocker local được xử lý.

Không cần tạo thêm test chỉ để khớp implementation; ưu tiên các tình huống người dùng và failure cases nêu trên. Review này không thay đổi code ứng dụng và không khẳng định source không còn lỗi ngoài các đường đã xem.
