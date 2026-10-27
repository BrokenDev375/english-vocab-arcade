# Báo cáo Xác minh Provider AI (Gemini)

- **Ngày xác minh**: 27/10/2026
- **Trạng thái**: VERIFIED (Adapter + Schemas + Fallback + Quota Contracts)

## 1. Thông tin Model & SDK

| Thuộc tính | Chi tiết |
|---|---|
| **SDK chính thức** | `@google/genai` |
| **Model Primary** | `gemini-2.5-flash` |
| **Model Fallback** | `gemini-1.5-flash` |
| **Giao thức Structured Output** | `responseMimeType: "application/json"` kết hợp `responseSchema` và Zod validation trên server |
| **Xử lý bí mật** | `GEMINI_API_KEY` chỉ đọc từ biến môi trường máy chủ (`server-only`), không bao giờ lộ ra Client Bundle |

## 2. Hạn mức & App Policy (docs/06 Section 8)

| Tiêu chí | Ngưỡng cấu hình | Cơ chế kiểm soát |
|---|---|---|
| **Giới hạn ngày** | 5 batches mới / user / ngày (UTC) | Bảng `ai_usage_daily` & RPC nguyên tử `reserve_ai_batch_v1` |
| **Giới hạn phút** | 2 operations / user / phút | Bảng `ai_rate_buckets` & RPC nguyên tử `reserve_ai_batch_v1` |
| **Thời hạn Lease** | 45 giây (TTL) | Trường `lease_until` & `lease_token` (UUID) chống trùng tác vụ |
| **Deadline Route** | Tối đa 20.000 ms (20 giây) | `AbortController` & kiểm tra thời gian thực thi còn lại |
| **Số lần gọi tối đa** | Tối đa 2 calls / operation | Thử Model Primary trước; chỉ fallback sang Secondary khi gặp lỗi tạm thời (5xx, timeout) |

## 3. Bốn Hợp đồng Nội dung (Zod Schemas)

1. **Context (`ContextOutputSchema`)**:
   - Tối đa 10 cards / batch.
   - Trả về câu ví dụ Anh - Việt kèm `targetSurface` và giải thích ngữ cảnh `explanationVi`.
2. **Grammar (`GrammarOutputSchema`)**:
   - Tối đa 6 cards / batch.
   - Trả về mảng `tokens` đúng thứ tự, danh sách `acceptedTokenOrders`, gợi ý `hintVi` và giải thích.
3. **Reading (`ReadingOutputSchema`)**:
   - Đoạn văn CEFR (A1: 50–90 từ, A2: 80–130 từ, B1: 110–180 từ).
   - Đúng 4 câu hỏi đọc hiểu 4 lựa chọn A/B/C/D kèm `correctIndex` (0–3).
4. **Translation (`TranslationOutputSchema`)**:
   - Dịch Việt → Anh, tối đa 10 cards / batch.
   - `acceptedAnswers` gồm đáp án tham chiếu và biến thể hợp lệ.

## 4. Kết quả Kiểm thử T14

- **Unit Test Suite**: `web/tests/unit/ai-service.test.ts` (5/5 PASS)
  - Xác thực sinh và parse JSON khớp chính xác Zod schema.
  - Từ chối nghiêm ngặt cardId bị ảo giác (hallucinated) không thuộc yêu cầu.
  - Tự động fallback sang model phụ khi model chính gặp sự cố kết nối.
  - Dừng ngay lập tức khi gặp lỗi xác thực 401 / 403, không gọi retry mù quáng.
  - Ngắt kết nối an toàn khi ngân sách thời gian (timeout budget) không còn đủ.
