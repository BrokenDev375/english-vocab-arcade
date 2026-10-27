# Cài database bằng Supabase SQL Editor

Mở SQL Editor của đúng project tiếng Anh website đang dùng: [qtqvytchmlqojolkobmw](https://supabase.com/dashboard/project/qtqvytchmlqojolkobmw/sql/new). Chọn role `postgres`.

Mở [english-vocab-arcade.sql](english-vocab-arcade.sql), copy **toàn bộ nội dung**, dán vào New query rồi Run. Không cần CLI/token trên máy.

File tự chạy migrations theo thứ tự, cấp quyền Data API cụ thể, bật RLS và tạo profiles cho tài khoản Auth đã tồn tại. Nó ghi đầy đủ từng statement vào lịch sử migrations trong cùng transaction; nếu lỗi sẽ rollback. Bản 0006 bổ sung quyền rõ ràng cho project mới không tự expose bảng và khóa RPC lưu phiên đối với người chưa đăng nhập.

File dùng cho database mới hoặc database đã có đúng lịch sử migrations của repo. Nếu schema/history khác, file dừng để không ghi đè. Gửi nguyên thông báo lỗi để kiểm tra; không xóa bảng hoặc giả mạo lịch sử để chạy tiếp.

Kết quả thành công: `English Vocab Arcade schema ready`, `applied_migrations = 6`, các cột boolean đều `true`. Sau đó báo đã chạy xong để kiểm tra lại `/api/sets` trên Vercel. Cấu hình Auth/AI vẫn là các bước riêng trong Dashboard/Vercel.

File được sinh từ nguồn bằng `node scripts/build-supabase-dashboard.mjs`. Không chỉnh tay file gộp. Các migrations đã áp dụng trước đó được giữ nguyên.
