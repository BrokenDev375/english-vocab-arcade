# 03 — Database, RLS và giao dịch

Đây là đặc tả để viết migrations; chưa có schema nào được áp dụng. PostgreSQL trên Supabase là nguồn dữ liệu chuẩn. Tất cả thời điểm lưu bằng timestamptz UTC; múi giờ hiển thị lấy từ profile.

## 1. Quy ước

- Tên bảng/cột snake_case, UUID cho ID, uuid mặc định gen_random_uuid().
- created_at/updated_at lấy thời gian DB, không tin timestamp client.
- Không dùng email làm khóa chính hoặc hiển thị email trong explore.
- Bật RLS ngay trong migration tạo bảng exposed.
- Check constraint cho chuỗi, enum, số âm và JSON size; không chỉ dựa form.
- Chỉ select cột cần; không query profiles cho danh sách học phần.
- Tạo index cho FK và các điều kiện RLS/query thường dùng.
- Migration đã chạy chỉ được bổ sung bằng migration mới.

## 2. Bảng profiles

| Cột | Kiểu/ràng buộc |
|---|---|
| id | uuid PK, FK auth.users ON DELETE CASCADE |
| display_name | text, 1–80 ký tự; chỉ phục vụ giao diện tài khoản riêng |
| timezone | text default Asia/Ho_Chi_Minh; validate trong danh mục timezone IANA |
| preferred_voice | text nullable, en-US/en-GB |
| created_at, updated_at | timestamptz |

Trigger tạo profile khi signup, idempotent. display_name lấy metadata đã giới hạn độ dài; không yêu cầu username public. Sửa timezone không sửa timestamp lịch sử; chỉ ảnh hưởng cách tính ngày hiển thị hiện tại.

## 3. Bảng learning_sets

| Cột | Kiểu/ràng buộc |
|---|---|
| id | uuid PK |
| owner_id | uuid NOT NULL FK profiles ON DELETE CASCADE |
| title | text 1–160 |
| description | text default rỗng, tối đa 1.000 |
| language | text NOT NULL default en; CHECK = en trong beta |
| cefr_level | text enum A1,A2,B1,mixed |
| topic | text 1–80 |
| is_public | boolean default false |
| content_revision | bigint NOT NULL default 1, >0 |
| created_at, updated_at | timestamptz |

Index: owner_id, (is_public, created_at desc, id), (cefr_level, topic). Tìm title với giới hạn độ dài và query đã escape wildcard khi muốn tìm ký tự literal. Bộ dữ liệu lớn có thể bổ sung trigram index sau profiling.

Owner không được chuyển owner_id qua request update. Việc đổi title/description/level hoặc nội dung card phải đổi revision. Không tin revision do client gửi để ghi đè.

## 4. Bảng vocabulary_cards

| Cột | Kiểu/ràng buộc |
|---|---|
| id | uuid PK |
| set_id | uuid NOT NULL FK learning_sets ON DELETE CASCADE |
| term | text 1–80 |
| meaning_vi | text 1–300 |
| part_of_speech | text enum noun,verb,adjective,adverb,phrase,other |
| ipa | text nullable, <=120 |
| cefr_level | text A1,A2,B1 |
| example_en, example_vi | text nullable, <=500 mỗi cột |
| accepted_answers | jsonb mảng string, 1–8 phần tử không rỗng |
| position | int >=0 |
| content_source | text <=300, nguồn/giấy phép biên tập |
| review_status | text draft/reviewed, default draft |
| import_key | text nullable, unique(set_id, import_key) khi khác null |
| created_at, updated_at | timestamptz |

Index (set_id, position, id). Không unique(term) toàn hệ thống: cùng từ có thể có nhiều nghĩa. API import phát hiện nội dung gần trùng để người dùng quyết định.

accepted_answers luôn chứa term chuẩn; câu trả lời khác phải được khai báo cụ thể. Không biến toàn bộ từ đồng nghĩa thành đáp án cho mọi nghĩa.

Giới hạn 5.000 thẻ/bộ qua transaction khóa parent row khi thêm, để hai request song song không vượt cap. Trigger trên thay đổi thẻ bump parent content_revision; không giả định revision tăng đúng 1 cho cả import.

## 5. Bảng study_sessions

| Cột | Kiểu/ràng buộc |
|---|---|
| id | uuid PK, có thể dùng client-generated UUID đã validate để tạo idempotent |
| user_id | uuid NOT NULL FK profiles ON DELETE CASCADE |
| set_id | uuid nullable FK learning_sets ON DELETE SET NULL |
| mode | flashcard,learn,test,match,arcade_typing,arcade_recall,dictation,speak,grammar,reading,translate |
| content_revision | bigint >0 |
| content_snapshot | jsonb NOT NULL, dữ liệu tối thiểu cần tái hiện phiên; giới hạn 2 MB |
| ordered_card_ids | uuid[] NOT NULL |
| seed | text NOT NULL, để tái hiện shuffle và spawn |
| state | jsonb NOT NULL, trạng thái theo schema của mode; <=256 KB |
| status | active,paused,completed,abandoned |
| state_version | int default 1, >0 |
| active_elapsed_ms | bigint >=0 |
| started_at, updated_at, completed_at | timestamptz; completed_at nullable |

Index (user_id, updated_at desc), (user_id, set_id, mode, status).
Chỉ một phiên active/paused cho mỗi (user_id,set_id,mode) bằng partial unique index; nhiều phiên đã hoàn thành được phép. Resume tìm phiên phù hợp trước khi tạo mới.

content_snapshot do server dựng từ dữ liệu được phép đọc; client không tự đưa snapshot của private set người khác. Snapshot bài AI chứa đúng batch đang học và đáp án để chấm trong dịch vụ server.

Server kiểm tra kích thước snapshot trước khi tạo. Nếu bộ vượt giới hạn 2 MB, trả lỗi rõ và cho chọn phạm vi nhỏ hơn; không cắt thẻ âm thầm. Bộ 5.000 thẻ vẫn được lưu/phân trang bình thường, nhưng không hứa mọi bộ ở kích thước tối đa đều vừa một snapshot.

Khi revision hiện tại khác snapshot: thông báo nội dung đã thay đổi, cho xem kết quả cũ hoặc bắt đầu phiên mới. Không đổi card order giữa chừng. Set đã xóa: giữ lịch sử snapshot, không tiếp tục phiên học như set còn tồn tại.

## 6. Bảng study_attempts

| Cột | Kiểu/ràng buộc |
|---|---|
| id | uuid PK |
| session_id | uuid FK study_sessions ON DELETE CASCADE |
| user_id | uuid FK profiles ON DELETE CASCADE |
| card_id | uuid nullable FK vocabulary_cards ON DELETE SET NULL |
| client_event_id | uuid NOT NULL |
| question_key | text <=160, identity của câu hoặc lần đánh giá |
| attempt_kind | answer,self_rating,game_hit,game_miss |
| answer_text | text nullable <=2.000; không raw audio |
| is_correct | boolean nullable cho self_rating |
| grade_source | rule,reference_match,self_rating,ai_feedback |
| feedback | jsonb bounded <=16 KB, không secret |
| active_elapsed_ms | int 0–600000 cho một event |
| created_at | timestamptz server |

UNIQUE(session_id,client_event_id) chống ghi lại cùng event khi retry.
Index (user_id,created_at desc), (card_id,user_id).
user_id phải khớp session.user_id; không tin ID gửi từ client. Cập nhật attempt cũ bị cấm sau khi đã ghi nhận.

TTS, mở trang, pause, lật thẻ không sinh answer attempt. AI feedback tự do không được tăng mastery như một đáp án đóng đã xác minh.

## 7. Bảng study_progress

PK (user_id,card_id), FK tương ứng ON DELETE CASCADE.
Cột: correct_count int >=0, incorrect_count int >=0, correct_streak int >=0, mastery new/learning/mastered, due_at timestamptz, last_reviewed_at timestamptz, updated_at timestamptz.
Index (user_id,due_at).
Mastered sau 4 answer đúng liên tiếp theo scheduler, sai đặt learning và reset streak. Không cập nhật hai lần từ duplicate event.

## 8. Bảng ai_batches

| Cột | Kiểu/ràng buộc |
|---|---|
| id | uuid PK |
| user_id | uuid FK profiles ON DELETE CASCADE |
| set_id | uuid FK learning_sets ON DELETE CASCADE |
| mode | context,grammar,reading,translation |
| card_ids | uuid[] |
| content_revision | bigint |
| cache_key | text NOT NULL, unique(user_id,cache_key) |
| prompt_version, schema_version | text NOT NULL |
| status | pending,ready,failed |
| lease_until | timestamptz nullable |
| lease_token | uuid nullable, token worker đang sở hữu operation |
| retry_after | timestamptz nullable |
| output | jsonb nullable, tối đa 256 KB |
| model_id | text nullable, model thực sự đã dùng |
| error_code | text nullable, không chứa nội dung provider nhạy cảm |
| created_at, updated_at | timestamptz |

Chỉ own-user SELECT. User không trực tiếp INSERT/UPDATE/DELETE. Ghi qua module server được phép sau khi xác thực và kiểm tra quyền bộ.

Cache private theo user ở beta; không chia sẻ nội dung private giữa người dùng để giảm request. Nội dung được biên tập và công bố sẵn mới là nguồn dùng chung.

## 9. Quota và idempotency metadata

**ai_usage_daily**: scope_key text + usage_date date là PK; reserved_calls int >=0; reserved_operations int >=0; updated_at. Operations giới hạn batch mới/user/ngày, calls giới hạn provider calls bao gồm retry.
scope_key có dạng user:<uuid> hoặc project; không có SELECT trực tiếp từ browser.

**ai_rate_buckets**: scope_key text + bucket_start timestamptz (đầu phút UTC) là PK; operation_count int >=0; updated_at. Khóa row và tăng atomically khi chấp nhận operation mới; không dùng bộ đếm RAM. Dọn buckets cũ qua script vận hành có giới hạn, không cần cron để enforcement đúng.

**ai_request_keys**: (user_id,idempotency_key) unique; request_hash text; batch_id FK ai_batches; created_at. Lặp key cùng payload trả cùng operation; khác payload trả 409.

Tạo policy mặc định deny cho cả hai bảng. Server cập nhật budget trong transaction khóa hàng. Daily quota dùng ngày UTC để định nghĩa rõ; không lấy timezone client để né quota.

## 10. Ma trận RLS và grants

| Bảng | Anon | User A | User B |
|---|---|---|---|
| profiles | Không đọc/ghi | Đọc/sửa profile A | Không đọc profile A |
| learning_sets | Đọc public | CRUD bộ A; đọc public | Không đọc bộ A private |
| vocabulary_cards | Đọc nếu parent public | CRUD nếu owner parent; đọc parent hợp lệ | Không sửa thẻ A |
| study_sessions | Không | SELECT own; ghi qua API/RPC có guard | Không đọc/ghi A |
| study_attempts | Không | SELECT own, không direct write | Không đọc/ghi A |
| study_progress | Không | SELECT own, không direct write | Không đọc/ghi A |
| ai_batches | Không | SELECT own | Không đọc/ghi A |
| ai_usage_daily/ai_rate_buckets/ai_request_keys | Không | Không direct access | Không direct access |

learning_sets UPDATE phải có USING owner và WITH CHECK owner; cards mutation kiểm tra owner của parent ở cả USING/WITH CHECK. Parent visibility policy trên cards không tham chiếu vòng lại cards gây recursion.

profiles private không cản đọc public sets: quan hệ owner tồn tại nhưng query explore không JOIN profile.

Cơ chế RLS và grants tham khảo [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). RLS phải test bằng key/session user thật, không bằng admin client.

## 11. Các transaction/RPC bắt buộc

Tên có thể giữ như dưới đây để giảm sai lệch API:

### create_study_session_v1

User JWT hoặc module server xác thực: kiểm tra quyền parent, snapshot đúng revision và ordered IDs hợp lệ; nếu active session cùng mode tồn tại trả existing hoặc explicit restart. Không tạo song song hai phiên active.

### save_session_state_v1

Input session_id, expected_version, state hợp lệ, elapsed_ms.
Khóa session; verify owner; chỉ cho active↔paused hoặc explicit completed/abandoned; không cho terminal→active. Khi version lệch trả conflict và latest_version. Tăng version một lần nếu ghi thành công.

### record_attempt_v1

Được gọi bằng server-only admin module sau khi route xác thực user và chấm đáp án.
Trong cùng transaction:
1. Khóa session; kiểm tra user_id, quyền đọc set và question thuộc snapshot.
2. Nếu event_id đã có, trả kết quả cũ, không cộng tiến độ.
   Sau duplicate check mới đối chiếu expected_version; lệch version thì trả conflict trước khi ghi event mới.
3. Ghi attempt theo kết quả đã validate.
4. Cập nhật study_progress cho answer/game recall có ý nghĩa học; typing nhìn từ chỉ ghi practice, không tăng mastery.
5. Cập nhật session state/version nếu event yêu cầu, rồi trả kết quả.
6. Không cập nhật rating/self_rating thành answer đúng.

RPC dành riêng service_role/role tương đương secret key, revoke anon/authenticated/PUBLIC. user_id chỉ lấy từ verified auth trên server; không từ request body.

### reserve_ai_batch_v1 và finalize_ai_batch_v1

Chỉ server: khóa cache entry và quota rows theo thứ tự project rồi user, tránh deadlock. Cache ready không giữ chỗ request provider. Pending còn lease trả existing. Một worker có lease mới được gọi provider/finalize. Lease hết hạn chỉ takeover khi thao tác cũ đã hết deadline; policy chi tiết docs/06.

Mọi chức năng SECURITY DEFINER đặt search_path = '' và dùng public.<table> đầy đủ, kiểm tra tham số và grants. Không tạo RPC generic execute_sql hoặc cho arbitrary JSON ghi mọi bảng.

## 12. Migration sequence

- 0001_core: profiles, learning_sets, cards, FK/check/index.
- 0002_auth_and_rls: profile trigger, policies/grants, immutable-owner guards, revision triggers.
- 0003_study: sessions, attempts, progress, idempotency và RPC.
- 0004_ai: batches, budgets, keys, lease/quota RPC.
- 0005_content_constraints: các index/constraints bổ sung sau test import.
Tên thật dùng timestamp do Supabase CLI tạo; thứ tự mô tả này không thay timestamp.

Mỗi migration được test apply từ DB rỗng. Review SQL do CLI sinh trước khi commit. [Hướng dẫn migrations](https://supabase.com/docs/guides/local-development/database-migrations).

## 13. Seed và data lifecycle

- Dev/test seed có các UUID ổn định, hai tài khoản test chỉ trong local stack.
- Production tạo publisher account thật trước; seed script lấy SEED_OWNER_ID được operator cung cấp.
- Không commit password tài khoản production hoặc tạo auth.users thủ công bằng SQL không được kiểm tra.
- Seed có content_key riêng trong manifest, upsert theo ID cố định chỉ trong namespace seed; không ghi đè bộ do user tự tạo.
- content_source/review_status được lưu; 10 thẻ ví dụ không tự động tính là 300 thẻ đã duyệt.
- Xóa tài khoản cần xóa/ẩn dữ liệu liên quan theo FK đã chốt và có bước xác nhận rõ trong UI.

## 14. Kiểm tra bắt buộc

Anon không thấy private; B không đọc/sửa private A; B không đổi owner_id; B không ghi attempt trực tiếp; duplicate event không tăng count; concurrent quota không vượt cap; card edit đổi revision; xóa card không xóa lịch sử attempt snapshot; role thường không gọi privileged RPC.

Không triển khai production khi một trong các kiểm tra phân quyền quan trọng chưa chạy.
