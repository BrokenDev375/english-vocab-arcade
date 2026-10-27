# 05 — Word Blaster: đặc tả game

Đây là đặc tả cơ chế riêng của dự án, lấy cảm hứng từ thể loại typing/recall shooter. Không chép giao diện, logo hoặc assets của Parroto. Tham khảo tính năng công khai: [Luyện Gõ](https://parroto.app/vi/vocabulary/typing-game), [Mưa Từ Vựng](https://parroto.app/vi/vocabulary/word-rain).

## 1. Hai chế độ

**Typing:** mục tiêu hiển thị từ tiếng Anh; người chơi gõ từ đó. Rèn chính tả và tốc độ. Chỉ tính practice, không tự tăng mức thuộc từ.

**Recall:** mục tiêu hiển thị nghĩa tiếng Việt và số ô chữ; không hiện sẵn đáp án. Người chơi nhớ rồi gõ từ tiếng Anh. Kết quả hit/miss dùng để lập lượt ôn lỗi; hit dùng gợi ý không được tính như nhớ độc lập.

Ví dụ:
~~~text
Nghĩa: dũng cảm
_ _ _ _ _
Bạn gõ: b r a v e
→ Mục tiêu bị hạ, + điểm, có thể nghe từ sau khi hoàn tất.
~~~

## 2. Các quy tắc cố định bản đầu

| Hằng số | Giá trị mặc định |
|---|---|
| Lives | 3 |
| Cards/stage | 10, chặng cuối lấy phần dư |
| Active targets stage đầu | tối đa 2 |
| Active targets các stage sau | tối đa 3 |
| Spawn interval | max(900, 1600 - stageIndex*100) ms |
| Flight time | clamp(11000 + 500*answerLength - 700*stageIndex, 8000, 24000) ms |
| Base hit score | 100 |
| Speed bonus | floor(40 * remainingFlightFraction) |
| Hint hit score | chỉ base score, không speed bonus |
| Wrong key | không mất mạng; tăng wrongKeyCount và báo nhẹ |
| Miss | mất 1 mạng, tăng missed count đúng một lần |
| Pause giữa chặng | có, chờ bấm Chặng tiếp theo |

clamp(x,min,max) và stageIndex bắt đầu từ 0. answerLength tính trên đáp án chuẩn đã normalize, gồm khoảng trắng bên trong cụm từ. Không ngầm thêm combo multiplier ở beta.

Score = tổng base + bonus của các hit; không có điểm âm. Ngoài max targets, scheduler không spawn mục tiêu mới khi modal/paused/terminal.

## 3. Chọn và chuẩn bị cards

1. Tải snapshot cards được phép đọc.
2. Filter eligibility: term/accepted answer 1–40 ký tự, chỉ Latin ASCII, khoảng trắng, dấu nháy, gạch nối; nghĩa không rỗng.
3. Báo tổng số thẻ dùng được và số thẻ không phù hợp. Không bỏ thẻ mà không thông báo.
4. Dedupe theo card ID; giữ các thẻ cùng từ nhưng khác nghĩa.
5. Fisher–Yates một lần cho toàn session với seed lưu lại.
6. Chia ordered IDs thành stage 10. Không bốc random từ toàn bộ bộ ở mỗi stage.
7. Spawn mỗi card ID đúng một lần trong lượt chính, dù card trước hit hay miss.
8. Thẻ trượt tạo danh sách review riêng ở kết quả, không quay lại hàng chờ chính.

0 card eligible: empty state với nút chọn bộ khác. 1 card: chơi bình thường. Không tạo fake targets để đủ số lượng.

Khi hai targets có tập đáp án chuẩn hóa giao nhau: không spawn đồng thời; giữ card sau trong queue tới khi target trước resolved. Không xóa card hoặc cho một từ gõ trúng nhiều target.

## 4. Engine state và events

~~~ts
type Phase =
  | 'ready' | 'running' | 'paused'
  | 'stage_complete' | 'won' | 'lost';

type Target = {
  id: string;
  cardId: string;
  answerVariants: string[];
  canonicalAnswer: string;
  meaning: string;
  progress: number;        // 0..1 theo thời gian bay
  flightTimeMs: number;
  spawnedAtMs: number;
  lane: number;
  hintUsed: boolean;
  resolved: boolean;
};

type GameState = {
  phase: Phase;
  mode: 'typing' | 'recall';
  seed: string;
  orderedCardIds: string[];
  stageIndex: number;
  spawnCursor: number;
  activeTargets: Target[];
  lockedTargetId: string | null;
  typedBuffer: string;
  lives: number;
  score: number;
  elapsedMs: number;
  wrongKeyCount: number;
  hitIds: string[];
  missedIds: string[];
  hintedIds: string[];
};
~~~

Engine APIs:
~~~ts
createGame(snapshot, options, rng): GameState
step(state, deltaMs): { state: GameState; events: GameEvent[] }
consumeText(state, text): { state: GameState; events: GameEvent[] }
backspace(state): GameState
unlockTarget(state): GameState
selectTarget(state, targetId): GameState
pause(state, reason): GameState
resume(state): GameState
nextStage(state): GameState
serialize(state): SavedArcadeState
restore(saved, snapshot): GameState
~~~

Events tối thiểu: TARGET_HIT, TARGET_MISSED, STAGE_COMPLETED, GAME_WON, GAME_LOST, GAME_PAUSED.
Mỗi event có eventId ổn định để persistence retry không ghi trùng.

Renderer không tự đổi lives, chọn card hoặc quyết định đúng/sai. Audio và particle animation phản ứng theo events, không tác động engine outcome.

## 5. Khóa mục tiêu và nhập chữ

Input normalization:
- Unicode NFKC, lowercase, trim đầu/cuối khi kiểm tra đáp án.
- Chuẩn hóa dấu nháy cong thành nháy đơn ASCII, collapse nhiều space.
- Không xóa dấu nháy/gạch nối trong từ; không chấp nhận một substring là toàn bộ đáp án.
- recall dùng accepted_answers; typing dùng canonical term đang hiển thị.

Khi chưa khóa:
- Click/tap target để chọn rõ.
- Hoặc ký tự đầu khớp một target thì khóa target đó.
- Nhiều target khớp cùng ký tự: chọn target có remainingFlightTime nhỏ nhất; hòa thì spawnedAt rồi id.
- Không có target phù hợp: không khóa, tăng wrongKeyCount, flash input nhẹ.

Khi đã khóa:
- Chỉ chữ tiếp theo phù hợp prefix của ít nhất một answerVariant mới được thêm vào buffer.
- Wrong key giữ buffer, tăng wrongKeyCount; không thay target và không làm mất mạng.
- Buffer hoàn thành đúng một variant: resolve target một lần, emit HIT, bỏ lock/buffer.
- Backspace xóa chữ cuối; buffer rỗng thì Backspace nhả target.
- Escape nhả target và xóa buffer.
- Tap target khác: nhả target cũ, xóa buffer và khóa target mới; thời gian bay của target cũ không reset.

Mục tiêu trượt khi đang khóa: emit MISS, giảm lives một lần, nhả lock và buffer. Target trong animation hit không thể bị tính miss.

## 6. Gợi ý recall

Ở progress >=0.65 và >=0.85, nếu target chưa resolved:
- Hiện chữ đầu, sau đó chữ cuối của canonical answer.
- Với đáp án rất ngắn, không lộ toàn bộ từ một cách vô nghĩa; có thể chỉ hiện chữ đầu.
- Đánh dấu hintUsed. Kết quả tách hit có gợi ý và hit tự nhớ.
- Gợi ý hiển thị không tự chèn vào buffer; người dùng vẫn gõ.
- Ở màn kết quả, mọi từ miss hiện đáp án, nghĩa và nút nghe.

## 7. Chuyển trạng thái

~~~text
ready --Start--> running
running --Pause/hidden--> paused
paused --Continue--> running
running --queue rỗng & targets rỗng & lives>0--> stage_complete
stage_complete --Next & còn stage--> running
stage_complete --không còn stage--> won
running --lives=0--> lost
won/lost --Play again--> ready với session mới
~~~

Terminal wins/lost không nhận thêm key hoặc tick tạo điểm. Khi miss cuối cùng làm lives=0 đồng thời hết queue: LOST ưu tiên, không phát cả win và lose.

Tiêu đề won là hoàn thành lượt, không tuyên bố đã thuộc tất cả nếu có miss/hint. Hiển thị hit, miss, hit có gợi ý và từ chưa gặp nếu thua sớm.

## 8. Chặng và progress

TotalStages = ceil(eligibleCount/10). Progress chính là resolvedCount/eligibleCount; không dùng score để suy ra đã học bao nhiêu từ.

Stage complete chỉ khi mọi card trong stage đã spawn và mọi target đã hit/miss. Pause timer ở màn stage complete. Chặng sau lấy đoạn kế tiếp từ orderedCardIds, không shuffle deck lại.

Session lost trước cuối bộ: đánh dấu chưa đi hết, không tự cho mọi từ còn lại là sai. Cho lựa chọn chơi lại từ đầu hoặc ôn những từ đã trượt.

## 9. Vòng lặp và responsive

- Dùng requestAnimationFrame; render Canvas không setState React mỗi frame.
- Engine advance bằng fixed timestep 16.6667 ms với accumulator.
- Khoảng cách frame >250 ms khi tab hidden/thiết bị gián đoạn: tự pause thay vì làm các target rơi mất trong một frame.
- Giới hạn số step bù mỗi frame; nếu backlog vẫn lớn, pause thông báo tiếp tục. Không âm thầm tăng tốc để bù.
- visibilitychange luôn pause; quay lại phải bấm Continue.
- Resize canvas bằng ResizeObserver; scale theo devicePixelRatio, cap DPR=2.
- Game progress lưu tương đối 0..1, không pixel để resize không teleport/collision lại.
- Chừa vùng HUD và input; không để mục tiêu bị bàn phím điện thoại che.
- Renderer có giới hạn particles; dispose rAF/listener/audio khi unmount.

Logic không được phụ thuộc kích thước màn hình hoặc FPS để tính score. Hiệu ứng có thể giảm theo reduced-motion/low performance.

## 10. Bàn phím điện thoại

Sử dụng input HTML thật, có label, autocomplete off, autocapitalize none, autocorrect off, spellcheck false. Không dùng input display:none vì không mở được bàn phím native.

Bridge input tách khỏi engine:
- Printable text đi qua onInput/IME composition; không xử lý thêm lần nữa bằng printable keydown.
- Keydown chỉ cho control keys như Backspace/Escape.
- Trong composition không consume ký tự trung gian; consume một lần khi composition hoàn tất.
- Paste/autofill không được tạo burst hit nhiều từ; chặn paste với thông báo rõ hoặc giới hạn một target.
- Input có thể là buffer tạm rồi clear sau khi consume; HUD hiển thị typedBuffer của engine.
- Tap Start/focus input từ cử chỉ người dùng; không ép autofocus lặp lại sau mỗi render.
- Khi bàn phím làm viewport co lại, canvas reflow đúng; có nút Focus bàn phím.
- Không bắt toàn bộ key ở window khi user đang ở menu hoặc form khác.

## 11. Persistence game

Lưu đủ queue cursor, targets, progress, lock, lives, score và seed để resume. Restore luôn vào paused, không cho target tự rơi trong thời gian tab đóng. Không tính khoảng thời gian offline vào active elapsed.

Mỗi hit/miss có eventId, snapshot save theo docs/04. Retry event giữ ID. Nếu save lỗi, hiển thị chưa đồng bộ và giữ local backup. Phiên guest chỉ có local state và không hiện như đã đồng bộ tài khoản.

## 12. Âm thanh và hiển thị

Tiếng bắn/hit ngắn, không che audio phát âm. Bật âm mặc định sau tương tác và có mute. TTS sau hit optional, không xếp hàng hàng chục câu; cancel utterance cũ khi bắt đầu mới.

Tạo spaceship/targets/particles bằng vector/code đơn giản. Không cần model 3D, multiplayer server hoặc engine vật lý.

## 13. Kiểm thử bắt buộc

- Dữ liệu 0,1,9,10,11,20,21,1.001 cards; không thiếu/lặp ID.
- Cùng seed + cùng chuỗi input/tick cho cùng outcome.
- Hai target cùng initial chọn theo urgency ổn định.
- Hai cards cùng answer không active đồng thời; không bị bỏ sót.
- Thay target, backspace, escape, sai ký tự và accepted variant.
- Miss đang khóa, hit đúng frame collision, lives=0 ưu tiên lost.
- Hint dùng không cộng speed bonus/mastery như recall độc lập.
- Pause/hidden/restore không đổi vị trí, lives hoặc elapsed.
- Resize/keyboard viewport không gây miss giả.
- Một input event không được xử lý hai lần.
- Không có request Gemini/network theo từng chữ.
