# 04 — API và lưu tiến độ

## 1. Quy ước chung

Route Handlers chạy Node runtime. Request/response được validate bằng schema dùng chung. Không trả stacktrace, provider raw error hoặc secret. Dùng status HTTP đúng.

~~~json
{
  "data": {},
  "meta": { "requestId": "uuid", "version": 1 }
}
~~~

~~~json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Tiến độ đã được cập nhật ở nơi khác.",
    "retryable": false,
    "details": { "latestVersion": 8 }
  }
}
~~~

Mã chuẩn: VALIDATION_ERROR/400, UNAUTHENTICATED/401, FORBIDDEN/403, NOT_FOUND/404, VERSION_CONFLICT/409, PAYLOAD_TOO_LARGE/413, RATE_LIMITED/429, AI_UNAVAILABLE/503, UPSTREAM_TIMEOUT/504.
Private resource trả NOT_FOUND cho người không được xem để tránh tiết lộ existence.

Mọi mutation cookie-based: kiểm tra Origin theo URL request/allowlist deployment đã tin cậy; không lấy origin do client tự khai để bypass. Request server/test không có Origin dùng cơ chế xác thực nội bộ rõ và test riêng; không mặc định cho mọi request thiếu Origin.

## 2. Danh mục endpoint

| Method/path | Auth | Hành vi |
|---|---|---|
| GET /api/health | Public | ok + commit SHA, không env/key/user |
| GET /api/sets | Public hoặc user | list public/owned theo scope, search/level/topic/page |
| POST /api/sets | User | tạo owner=self, private mặc định |
| GET /api/sets/:id | Theo visibility | metadata, card_count, revision |
| PATCH /api/sets/:id | Owner | cập nhật trường cho phép, revision guard |
| DELETE /api/sets/:id | Owner | xóa bộ sau xác nhận UI, lịch sử theo schema |
| GET /api/sets/:id/cards | Theo visibility | cursor pagination, position/id ổn định |
| POST /api/sets/:id/cards | Owner | tối đa 100 thẻ/request, retry idempotent |
| PATCH /api/sets/:id/cards/:cardId | Owner | cập nhật có revision guard |
| DELETE /api/sets/:id/cards/:cardId | Owner | kiểm tra thẻ thuộc đúng parent |
| POST /api/sessions | User | create/resume/restart có snapshot |
| GET /api/sessions/:id | Own | state và version đã lưu |
| PATCH /api/sessions/:id | Own | state transition + optimistic concurrency |
| POST /api/attempts | Own | server grading + idempotent transaction |
| GET /api/progress | User | due/recent/stats, user=self |
| POST /api/ai/batches | User | cache hit hoặc tạo batch có quota |
| GET /api/ai/batches/:id | Own | đọc status/output, không tự gọi provider |
| POST /api/ai/feedback | User | optional sau beta; không bắt buộc MVP |

Không cần dùng API cho mọi GET server-side nếu repository đã bảo vệ tương đương. Route data contract và authorization phải giữ nhất quán; không tạo endpoint public để vượt private repository.

## 3. Pagination

Danh sách bộ pageSize mặc định 12, tối đa 50. Cards pageSize mặc định 200, tối đa 500, cursor (position,id). Response có nextCursor/null.

Thuật toán tải toàn bộ:
- Đọc metadata revision ban đầu.
- Duyệt các trang, cộng theo ID, không chỉ lấy range đầu.
- So revision sau khi hoàn thành; nếu thay đổi, hiển thị nội dung đang được cập nhật và tải lại có giới hạn một lần.
- Không âm thầm bỏ card khi API cap mặc định 1.000.
- Không sort random ở mỗi lần fetch hoặc render.

## 4. Tạo phiên

~~~json
{
  "setId": "uuid",
  "mode": "arcade_recall",
  "action": "resume_or_create",
  "settings": { "stageSize": 10, "voice": "en-US" }
}
~~~

action: resume_or_create/restart. Restart đánh dấu phiên cũ abandoned trước khi tạo mới trong transaction. Snapshot lưu đủ cards/questions và seed để tái hiện. Không nhận userId từ client.

Response trả sessionId, stateVersion, snapshotRevision, orderedCardIds, state, settings và completed/paused status. Guest tạo phiên trong tab theo cùng schema nhưng không gọi privileged endpoints.

## 5. Save và optimistic concurrency

~~~json
{
  "expectedVersion": 7,
  "state": { "stageIndex": 1, "status": "paused" },
  "activeElapsedMs": 15320
}
~~~

State thực tế phải theo discriminated union của từng mode; đây chỉ là ví dụ shape tối giản.

Save tại:
- Câu trả lời/ghép cặp/hit/miss hoàn tất: lập event và lưu sớm.
- Chuyển chặng, pause, kết thúc: lưu ngay.
- Khi hoạt động lâu mà chưa có event: autosave 5 giây.
- Khi tab hidden: pause engine, best-effort save.
- Khi beforeunload: không dựa fetch đó là phương thức duy nhất; record đã có backup local.

Serialize cả attempt requests và state-save requests theo một queue của session. Coalesce snapshot mới, giữ event chưa ack. Trước khi gửi lấy expectedVersion mới nhất đã ack, không đóng băng version cũ từ lúc người dùng bấm. Response phải cập nhật base version trước khi gửi mutation kế tiếp. Không để request cũ đến sau ghi đè state mới.

Khi 409:
1. Đọc phiên mới nhất.
2. Ngừng autosave ở tab cũ và hiển thị đang được dùng nơi khác.
3. Cho mở lại phiên mới hoặc explicit restart; không tự dùng last-write-wins.
4. Chỉ replay event chưa ack nếu còn cùng session/snapshot và endpoint idempotent chấp nhận.

## 6. Local backup

Key:
eva:v1:<user-id-or-guest>:<set-id>:<mode>:<session-id>

Value gồm schemaVersion, sessionId, baseServerVersion, snapshotRevision, savedAt, state, pendingEvents. Không chứa token/secret. Chỉ lưu dữ liệu học cần thiết của phiên; giới hạn 256 KB.

- Local backup không là cơ sở phân quyền hoặc điểm authoritative.
- Server version quyết định sau đồng bộ.
- Kiểm tra schema và user ID trước khi đọc.
- Logout xóa active buffers và backup riêng của user trên thiết bị, không xóa server history.
- Không merge guest progress vào user âm thầm; có hành động import rõ.
- Nếu localStorage đầy/bị chặn: app vẫn chạy, báo không thể backup trên thiết bị và giữ server save.
- Nếu phiên đã terminal trên server: không restore thành active từ backup cũ.

## 7. Attempts và chấm

~~~json
{
  "sessionId": "uuid",
  "clientEventId": "uuid",
  "expectedVersion": 7,
  "questionKey": "card-id:written:round-1",
  "answerText": "colour",
  "activeElapsedMs": 4300
}
~~~

Server lấy target từ session snapshot, không từ answerKey client gửi. Grader đóng dùng accepted_answers; ghi feedback và progress trong cùng transaction.

Mỗi lần trả lời có event ID mới; retry cùng event giữ cùng ID. Double click không được tạo hai event. Một question có thể được luyện lại có chủ đích ở lượt ôn lỗi với questionKey mới; retry mạng không biến thành lượt ôn mới.

Server kiểm tra event ID đã ghi trước khi xử lý version conflict để retry thành công cũ không bị coi là lỗi mới. Response attempt trả grade, progress và stateVersion hiện tại cho queue. Không chạy autosave độc lập song song làm bản thân tab tự gây 409.

Flashcard self rating và arcade typing ghi practice, không coi là recall mastery. Speech transcript score lưu grade_source=reference_match; không phát biểu đo chất lượng từng âm.

## 8. Import CSV/XLSX

Mỗi file <=5 MB; tối đa 5.000 dòng hợp lệ/bộ. Kiểm tra parser limit chống sheet quá lớn. Preview 50 dòng đầu + tổng số; row lỗi có số dòng và lý do; cho tải danh sách lỗi.

Map các cột: term,meaning_vi,part_of_speech,ipa,cefr_level,example_en,example_vi,accepted_answers.
accepted_answers trong CSV dùng JSON string hoặc phân cách | có hướng dẫn rõ; quote/newline trong nghĩa phải được parser xử lý đúng.

Sau xác nhận, upload theo chunk <=100 cards và <=128 KB JSON. Tạo import_key = SHA256(file hash + sheet index + row index + setId). Cùng file retry giữ key; unique constraint đảm bảo không tạo lại dòng đã thành công.

UI hiển thị x/y đã nhập; khi lỗi một chunk giữ checkpoint để retry. Không báo thành công cả file khi chỉ nhập được một phần. Tải lại tab có thể chọn lại cùng file để tiếp tục bằng import_key.

Không dùng delete all rồi insert all để lưu edit bộ lớn. Xóa/sửa là mutation rõ trên card IDs.

## 9. API AI và cache

POST /api/ai/batches:
~~~json
{
  "setId": "uuid",
  "mode": "translation",
  "cardIds": ["uuid-1", "uuid-2"],
  "targetLevel": "A2",
  "dialect": "en-US",
  "idempotencyKey": "uuid",
  "generationNonce": "0"
}
~~~

- Tối đa 10 cards cho context/translation; grammar tối đa 6; reading tối đa 8.
- Server tự fetch nội dung thực, xác minh set/card ownership/visibility.
- Trả 200 với batch ready; 202 nếu operation khác đang làm, kèm Retry-After.
- POST có thể giữ request để generate trong tổng deadline; không fire-and-forget sau response.
- GET status chỉ đọc DB; không gọi Gemini lần nữa.
- Cache hit không tiêu provider quota.
- Nội dung thay đổi/level đổi/prompt version đổi có cache key mới.
- generationNonce mặc định 0; chỉ nút Tạo bài khác explicit mới tạo nonce mới. Nonce và payload được giữ nguyên khi retry cùng operation.
- AI disabled hoặc thiếu key trả AI_UNAVAILABLE; không thay vào bằng câu giả gắn nhãn AI.

Các schema output và quota: docs/06-ai-and-content.md.

## 10. Độ tin cậy

Abort fetch khi component unmount nhưng không coi abort client là provider đã dừng. Giữ idempotency/cache lease để request mới không tạo batch trùng.

Timeout UI có retry thủ công, retry dùng cùng idempotency key cho operation đó. Poll 202 theo Retry-After, tối đa 30 giây, sau đó cho người dùng quay lại đọc status; không poll vô hạn.

Lỗi HTTP phân biệt cấu hình, quyền, dữ liệu và tạm thời. Không retry 400/401/403 theo vòng lặp. Dùng requestId để tra log nhưng không show stacktrace.
