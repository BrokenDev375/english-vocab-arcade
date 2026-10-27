# 07 — Kiểm thử và cổng nghiệm thu

## 1. Chiến lược

Test invariant và ranh giới dữ liệu quan trọng; không chỉ test implementation tự lặp lại. Engine game, shuffle, scheduler, answer normalization và schema AI dùng unit tests. RLS dùng database thật/local stack và ba role. E2E kiểm tra luồng chính ở desktop/mobile.

Provider AI được mock trong CI; request Gemini thật chỉ là smoke có kiểm soát khi chủ tài khoản đã cấu hình. Không để test suite tốn quota không giới hạn.

## 2. Fixture tối thiểu

- Bộ rỗng, 1/5/6/7/10/11/20/21 thẻ.
- Bộ 1.001 và 4.000 thẻ để kiểm tra pagination/import.
- Hai thẻ cùng term khác nghĩa; hai thẻ cùng nghĩa; hai accepted answer giao nhau.
- color/colour; don't; ice cream; mother-in-law; multi-word phrase.
- Nội dung có dấu tiếng Việt, dấu nháy kép, comma, newline trong CSV.
- Một thẻ không phù hợp arcade nhưng hợp lệ cho flashcard.
- User A, user B, anon. A có bộ public và private; B có bộ riêng.
- AI ready/pending/failed, timeout, 429, invalid JSON, wrong cardId, duplicated options.
- Local backup cũ, user khác, storage đầy và state schema version không còn hỗ trợ.

## 3. Unit tests quan trọng

| ID | Hành vi | Kết quả phải thấy |
|---|---|---|
| U01 | Shuffle seed ổn định, không mutate input | Mọi ID đúng một lần, cùng seed cùng kết quả |
| U02 | Match 20 cards | 6+6+6+2, không lặp giữa chặng |
| U03 | Match nội dung trùng | Không tạo hai cặp gây nhập nhằng |
| U04 | Pool câu hỏi card/type | Không trùng; không vượt pool thật |
| U05 | Distractor ít hoặc cùng nghĩa | Giảm lựa chọn/đổi kiểu, không nhân bản |
| U06 | Answer normalization | Case/space hợp lý; cat không bằng education |
| U07 | color/colour, contraction, phrase | Chỉ chấp nhận variant khai báo; không xóa nghĩa |
| U08 | Review scheduler | Đúng tăng interval; sai reset; retry không nhân count |
| U09 | Arcade counts và stage remainder | Không thiếu ID dù hit/miss; 0 eligible có empty |
| U10 | Target locking có cùng initial | Chọn urgency rồi tie-break ổn định |
| U11 | Wrong key/backspace/escape/switch | Buffer và lock đúng, không thay thời gian bay |
| U12 | Hit trùng frame collision | Một outcome, không vừa cộng điểm vừa mất mạng |
| U13 | Zero lives cuối stage | Lost ưu tiên; terminal bỏ qua input |
| U14 | Pause/hidden/resume/restore | Không tính thời gian offline, không miss giả |
| U15 | Hints/typing practice | Không tự tính mastery như recall không gợi ý |
| U16 | AI schema/context target | Đủ IDs, không trùng, target là nguyên token/cụm |
| U17 | AI key/hash | Revision/level/prompt/nonce thay thì key đổi |
| U18 | API request schema | Reject số âm, body lớn, mode lạ, IDs ngoài set |

RNG/clock inject trong test, không monkey-patch Math.random toàn ứng dụng. Dùng property-style loops với seed xác định cho số lượng thẻ khác nhau; không test random dễ flake.

## 4. RLS và transaction tests bắt buộc

Chạy bằng Supabase client với publishable key và JWT của A/B, không chỉ bằng service role.

| ID | Thao tác | Mong đợi |
|---|---|---|
| D01 | Anon list sets/cards | Chỉ public, không profiles hoặc private |
| D02 | B query private A bằng UUID trực tiếp | Không đọc được row/nested cards |
| D03 | B update/delete cards A | Bị từ chối hoặc không có row bị đổi |
| D04 | A chuyển owner_id sang B | Bị chặn |
| D05 | B đọc session/progress/AI A | Không dữ liệu |
| D06 | User gọi privileged RPC | Không có quyền EXECUTE |
| D07 | Browser insert attempt/progress trực tiếp | Bị chặn |
| D08 | POST attempt cùng event hai lần | Một row, count tăng một lần |
| D09 | Hai request tạo active session cùng mode | Một active session |
| D10 | Two saves cùng expectedVersion | Một thành công, một 409 |
| D11 | Concurrent quota sát cap | Không vượt app budget |
| D12 | Delete/edit card | Revision đổi, lịch sử snapshot không sai |
| D13 | Auth user khác trong body | Server bỏ qua/reject, dùng verified user |
| D14 | Hai import chunks cùng import_key | Không nhân đôi cards |
| D15 | Hai import requests sát 5.000 thẻ | Cap không bị vượt do race |
| D16 | Reset/apply migrations từ database rỗng | Không lỗi dependency/policy/triggers |

Nếu database test không chạy vì thiếu Docker/credentials, ghi BLOCKED. Không thay D01–D16 bằng test giả chỉ assert tên policy trong SQL.

## 5. API integration tests

- Cookie auth hợp lệ, hết hạn, không có cookie.
- Origin khác, open redirect qua next=//evil.example.
- User sửa bộ của mình nhưng không bộ khác.
- GET pagination trả đủ 1.001 thẻ, thứ tự ổn định.
- Save state version cũ bị từ chối, UI reconcile không nhân event.
- Retry import sau partial failure tiếp tục đúng.
- AI ready cache: không gọi provider.
- Hai requests cùng hash: một worker provider, một 202.
- Cùng idempotency key khác payload: 409.
- Worker timeout hoặc killed: lease/retry đúng; không pending vô hạn.
- 429/503/invalid JSON không thành ready; UI giữ bài cũ.
- AI feature disabled không khiến game/API học cơ bản lỗi.
- Test endpoint không trả GEMINI_API_KEY, email hoặc full profile.

## 6. E2E journeys

### E01 — Tài khoản

Signup → thông báo xác minh → xác nhận link → login → refresh → session còn → logout → protected page chuyển login. Forgot/reset password hoạt động với URL đúng.

Local email dùng inbox local; production kiểm tra email thực và cấu hình SMTP/rate limits. Không vô hiệu xác minh production chỉ để test dễ hơn.

### E02 — Học phần

A tạo private bộ, thêm 20 cards, sửa một card, import file CSV có quote/newline, chuyển public. B/anon chỉ thấy khi public. Card explore không hiện tên/avatar/username.

### E03 — Learn/Test/Match

Học, trả lời sai, xem lượt ôn lỗi, nộp Test, xem đáp án; match đủ 4 chặng với 20 thẻ. Tiến độ và count không sai khi reload.

### E04 — Word Blaster typing

Desktop keyboard start, hit/miss, pause, resize, finish hoặc lose, xem kết quả. Không request AI theo từng chữ. 20 cards chia 2 chặng đúng.

### E05 — Word Blaster recall mobile

Viewport 390x844, native/text input, tap target, gõ phrase, Backspace, hidden/resume, bàn phím co viewport. Ba lives đúng; đáp án trượt hiện audio button.

Automated mobile viewport không chứng minh bàn phím native thật. Cần ít nhất một kiểm tra thủ công trên điện thoại thật hoặc ghi UNVERIFIED.

### E06 — Restore và hai tab

A chơi dở → autosave ack → đóng tab → mở lại → paused đúng stage/lives. Tab B cùng user ghi version mới; tab A không ghi đè. Đăng xuất A rồi vào B trên cùng browser không restore phiên A.

### E07 — AI

Tạo batch → học câu → refresh → cùng batch/IDs, không thêm provider call. Edit card → revision mới tạo batch mới có explicit user action. AI 429 hiển thị retry, vẫn học/game bình thường.

### E08 — Nghe/nói

Audio phát sau user gesture. Mic bị từ chối/không hỗ trợ có thông báo và fallback. Không gắn điểm IELTS hoặc âm vị cho transcript similarity.

## 7. Lệnh chất lượng

Sau khi scripts đã được P0/P11 tạo, từ root:
~~~powershell
Push-Location './web'
npm ci
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run test:db
npm run build
npm run test:e2e
Pop-Location
~~~

Integration/DB tests cần môi trường riêng trong docs/08. CI tạo DB local và accounts fixture, không dùng production credentials.

Build phải dùng configuration hợp lệ cho môi trường test, không tạo dữ liệu cloud ở build time.

## 8. Performance và accessibility

- Không tăng số listener/rAF mỗi lần restart; unmount dọn sạch.
- Game target count bounded, không render React state mỗi tick.
- Target <=250 ms frame gap pause đúng, không làm mất 3 lives.
- Input-to-engine phản hồi ngay trong cùng event, không đợi request network.
- Thử Chrome/Edge desktop và trình duyệt mobile phổ biến thực tế.
- Contrast/focus/label được kiểm tra; giảm motion không làm hỏng luật game.
- No keyboard trap, không bắt phím khi user mở form khác.
- Không phát audio dồn hàng chục utterances sau khi unmute.

## 9. Release gates

G0: scripts/build và architecture hợp lệ.
G1: migrations/RLS/transaction tests pass.
G2: auth/CRUD/import/learning thật hoạt động.
G3: arcade invariants, mobile và persistence pass.
G4: AI cache/quota/schema/errors pass.
G5: Vercel đúng commit Ready; production smoke pass.

Phát hành hoàn chỉnh cần G0–G5. Học liệu 300 thẻ reviewed phải có manifest; nếu chưa đủ, chỉ phát hành thử nội bộ và ghi đúng phạm vi.

## 10. Ghi bằng chứng

Tạo reports/phase-Pxx.md, gồm commit, thời điểm, OS/runtime, lệnh, kết quả exit, ca manual, screenshot khi cần và lỗi còn lại. Không copy secret vào báo cáo. Test chưa chạy ghi NOT RUN kèm lý do; không ghi PASS từ suy đoán.
