# 08 — Supabase, GitHub, Vercel và vận hành

Runbook chỉ được thực hiện khi chủ dự án giao triển khai và đã có quyền tương ứng. Hiện bộ hồ sơ này chưa tạo dịch vụ nào.

## 1. Bản đồ môi trường

| Môi trường | Web | Database | AI |
|---|---|---|---|
| Local dev | localhost:3000 | Local Supabase qua Docker | Tắt mặc định/mock |
| CI | Next build + Playwright | Local ephemeral Supabase | Mock |
| Vercel Preview | URL preview | DB staging nếu có; nếu không dùng demo được ghi nhãn | Tắt mặc định |
| Production | URL website tiếng Anh mới | Supabase tiếng Anh mới | Bật sau smoke/quota |

Nếu tài khoản Free đã có database tiếng Trung và chỉ còn một suất, dùng suất còn lại cho production tiếng Anh; local dev thay staging cloud. Không mượn DB tiếng Trung hoặc gắn secret production vào mọi Preview để tiện test.

Supabase Free hiện công bố 2 project active; đây là giới hạn phải kiểm tra lại khi tạo: [Supabase pricing](https://supabase.com/pricing).
Vercel Hobby có giới hạn tài nguyên và mục đích sử dụng; trước phát hành thương mại kiểm tra gói phù hợp: [Vercel plans](https://vercel.com/docs/plans).

## 2. Chuẩn bị local

Từ thư mục root dự án:
~~~powershell
Get-Location
node --version
npm --version
git --version
~~~

Cần Node 24.x. Bootstrap Next vào web/ theo P0; không ghi đè root chứa tài liệu.
Sau bootstrap:
Lệnh bootstrap tham khảo từ root (xem help của phiên bản trước khi chạy):
~~~powershell
npx create-next-app@16 web --typescript --tailwind --eslint --app --src-dir --import-alias '@/*' --use-npm --disable-git --yes
~~~

web/ phải chưa tồn tại hoặc rỗng. Flag disable-git tránh tạo repository lồng trong web/; xác minh bằng help và kiểm tra không có web/.git sau bootstrap. Nếu source đã có, tiếp tục thay vì scaffold lại.

Sau khi app được tạo:
~~~powershell
Push-Location './web'
npm install --save-dev supabase
npx supabase --version
npx supabase --workdir .. init
npx supabase --workdir .. start
Pop-Location
~~~

init chỉ chạy nếu root chưa có supabase/config.toml. start cần Docker; khi Docker không sẵn, ghi blocker rồi làm engine/UI; chỉ dùng hosted dev DB riêng khi đã có quyền.

Lấy URL/key của local stack từ cấu hình CLI trên máy, điền web/.env.local; không dán toàn bộ output chứa key vào reports. Local publishable/anon key phải đúng local URL, không pha production URL với local key.

## 3. Migrations và types

Từ web/:
~~~powershell
npx supabase --workdir .. migration new core
# Model triển khai viết và review SQL của các migration theo docs/03.
npx supabase --workdir .. db reset
npx supabase --workdir .. migration list
~~~

db reset không thêm --linked: thao tác này chỉ cho local disposable DB. Dừng nếu CLI chỉ ra remote target khác dự định.

Generated types:
~~~powershell
npx supabase --workdir .. gen types typescript --local --schema public > src/types/database.generated.ts
~~~

Trên Windows PowerShell phải đảm bảo UTF-8 khi redirect text; nếu file bị UTF-16/BOM sai, dùng script Node ghi output UTF-8 rồi typecheck.

Trong hướng dẫn trên, comment hoặc placeholder không phải lệnh đã chạy. Nếu cú pháp CLI thay đổi theo version, xem help/tài liệu chính thức và cập nhật runbook, không đoán flag.

Chạy RLS tests A/B/anon trước mọi remote push. Quy trình tham khảo: [Database migrations](https://supabase.com/docs/guides/local-development/database-migrations) và [local workflow](https://supabase.com/docs/guides/local-development/cli-workflows).

## 4. Tạo Supabase project mới

Chủ tài khoản đăng nhập dashboard hoặc cấp quyền công cụ:
1. Chọn organization phù hợp, kiểm tra còn suất/gói.
2. New Project, tên english-vocab-arcade; chọn region gần nhóm người học và Vercel runtime khi có thể.
3. Đặt DB password mạnh qua nơi quản lý secret; không lưu trong docs.
4. Ghi project ref và URL mới vào reports/environment.md; đây không phải secret.
5. Lấy publishable key cho browser và secret key server khi cần.
6. Xác nhận project ref khác website tiếng Trung.
7. Không import user/dữ liệu tiếng Trung tự động.

Từ web/:
~~~powershell
npx supabase --workdir .. login
npx supabase --workdir .. link --project-ref <ENGLISH_PROJECT_REF>
npx supabase --workdir .. migration list
npx supabase --workdir .. db push --dry-run
npx supabase --workdir .. db push
~~~

Các giá trị <...> là placeholder phải thay trước chạy, không copy nguyên. Kiểm tra linked project trước push. Không dùng reset --linked, --include-seed hoặc sửa migration history trên production.

Nếu remote không rỗng/chứa schema không có trong repo: dừng bước push, điều tra drift và capture migration đúng; không xóa dữ liệu để ép khớp plan.

## 5. Auth configuration

1. Enable email/password, giữ email confirmation cho production.
2. Site URL = URL production tiếng Anh chính xác khi đã có.
3. Redirect allowlist: localhost dev trong môi trường phù hợp, production/auth/confirm và production/auth/callback theo flow.
4. Password recovery redirect về production/reset-password.
5. Nếu Preview dùng staging Auth, chỉ allowlist preview domains thuộc project/team của mình; không dùng wildcard rộng cho domain bất kỳ.
6. Kiểm tra email template dùng đúng token_hash/code flow của implementation.
7. Đặt SMTP phù hợp và test email thật trước mở beta; email không đến không được coi là signup xong.
8. Google OAuth chưa bắt buộc; nếu thêm sau, cấu hình provider và authorized URLs riêng.

Nguồn: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs) và [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
Server chỉ redirect tới relative path an toàn; không nhận next URL ngoài app.

## 6. Biến môi trường

Copy .env.example ở root sang web/.env.example, rồi tạo web/.env.local trên máy. Không commit .env.local.

| Biến | Public? | Môi trường/ý nghĩa |
|---|---|---|
| NEXT_PUBLIC_APP_URL | Có | localhost ở dev, URL chính thức ở production |
| NEXT_PUBLIC_SUPABASE_URL | Có | Đúng Supabase project của môi trường |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Có | Publishable key, vẫn bắt buộc RLS |
| SUPABASE_SECRET_KEY | Không | Privileged server RPC/AI/seed, không vào client bundle |
| GEMINI_API_KEY | Không | Chỉ Node server |
| GEMINI_MODEL_PRIMARY | Không | ID model đã verify |
| GEMINI_MODEL_FALLBACK | Không | Tùy chọn, model đã verify |
| AI_ENABLED | Không | false tới khi smoke hoàn tất |
| AI_DAILY_BATCHES_PER_USER | Không | Mặc định 5 |
| AI_PROVIDER_CALLS_PER_DAY | Không | Mặc định 50 |
| APP_ENV | Không | development/preview/production/test |
| DEMO_MODE | Không | true chỉ khi preview/demo không có DB; có nhãn |
| SEED_OWNER_ID | Không | Chỉ script nhập nội dung, không cần ở runtime thường |

SUPABASE_SECRET_KEY có quyền cao: chỉ import từ server-only module. API học phần thông thường vẫn dùng verified user client và RLS.

Vercel có các scope Development/Preview/Production; chỉnh env chỉ áp dụng cho deployment tiếp theo, cần redeploy để bundle public env đổi. [Vercel environment variables](https://vercel.com/docs/environment-variables).

## 7. Tạo GitHub repository riêng

Không dùng remote BrokenDev375/quizlet-clone cho app mới.
Khi chủ dự án đã cấp tên repo và quyền:
~~~powershell
git init -b main
git status --short
git add .
git diff --cached --stat
git diff --cached --check
git commit -m "chore: initialize English Vocab Arcade"
git remote add origin https://github.com/<OWNER>/<NEW_REPO>.git
git push -u origin main
~~~

Trước git add kiểm tra .gitignore và danh sách file. Không stage secrets, database dumps có dữ liệu thật, .next hoặc node_modules.
Không git push --force. Nếu repo remote đã có lịch sử, fetch/inspect và tích hợp có kiểm soát, không ghi đè.

## 8. CI trước deployment

Tạo .github/workflows/ci.yml:
- Trigger pull_request và push main.
- Checkout; Node 24; npm ci trong web/.
- Lint, typecheck, unit tests, build.
- Job database chạy local Supabase/Docker, migrations và RLS/integration tests.
- E2E chạy ứng dụng với test DB và mock AI.
- Upload report khi thất bại, không upload env/session tokens.
- Dùng versions action được kiểm tra và pin thích hợp; không dán action phỏng đoán.

Root Directory của Vercel khác với working directory của CI: CI cần root supabase/, web app chạy trong web/.

## 9. Import lên Vercel

1. Import **repository mới**.
2. Framework Preset Next.js.
3. Root Directory **web**.
4. Node 24.x, đồng nhất package.json engines.
5. Install npm ci; Build npm run build; output để Next.js tự xác định.
6. Thêm Production env đúng project; Preview env staging hoặc demo riêng.
7. Production Branch main.
8. Tạo deployment đầu với AI_ENABLED=false.
9. Chờ Ready. Nếu failed đọc build log, sửa nguyên nhân, chạy local check rồi deploy lại.
10. Ghi deployment URL, stable production URL và commit SHA vào reports/deployment.md.

Không giả định git push tự áp dụng Supabase migrations. Áp migrations theo bước 4 trước app release cần schema mới, có backward compatibility.

## 10. Seed production có kiểm soát

- Tạo publisher account đã xác minh.
- Xác minh SEED_OWNER_ID đúng account và đúng project.
- Chạy seed:content với flag môi trường explicit; mặc định script phải từ chối production nếu thiếu xác nhận đích cụ thể.
- Chỉ nhập namespace seed, không xóa bảng hoặc bộ của user.
- Xác minh số cards và review status; bắt đầu 30 thẻ tốt cho smoke.
- Không chạy dev seed bằng db push --include-seed trên production.

Contract CLI cho script seed:content mà T06 phải triển khai:
~~~powershell
Push-Location './web'
npm run seed:content -- --target production --project-ref <ENGLISH_PROJECT_REF> --allow-production --file ../examples/vocabulary.seed.json
Pop-Location
~~~
allow-production là cờ kiểm tra đích trong công cụ, không yêu cầu hỏi lại chủ dự án nếu việc seed/deploy đã được cho phép. Script phải so project ref explicit với URL env; lệch thì dừng. File ví dụ giữ private/draft, không coi là học liệu beta đã review.

## 11. Production smoke bắt buộc

Dùng stable URL trong browser mới và tài khoản test riêng:
- /api/health trả ok và commit SHA vừa release.
- Vercel deployment Ready tương ứng chính SHA đó.
- Homepage/explore load; không có tên/username/avatar tác giả.
- Signup/confirm/login/refresh/logout/reset password đúng domain.
- A tạo private set, B/anon không đọc được.
- Import, học và game với 20 thẻ chạy đúng chặng.
- Save → đóng tab → mở lại: resume đúng paused/session.
- AI đang off thì học/game vẫn chạy.
- Bật AI có quota → tạo một batch → reload đọc lại, không tăng call.
- Không có key trong browser bundle/network/log.
- Mobile input và audio test trên thiết bị thật hoặc ghi rõ phần chưa xác minh.

Chỉ sau các bước này mới nói website đã lên và được kiểm tra.

## 12. Khi người dùng vẫn thấy giao diện cũ

1. So commit GitHub main với Vercel deployment đang được alias production.
2. Kiểm tra /api/health buildSha; không dùng time deploy thay hash.
3. Mở stable URL trong tab mới; xác minh asset/code đang được phục vụ.
4. Nếu production vẫn là commit cũ: xem deployment fail/cancel/promotion/domain alias.
5. Nếu server đúng commit: hướng dẫn hard refresh, kiểm tra tab/cache/service worker nếu app có dùng.
6. Không tự thêm cache-busting code hoặc xóa dữ liệu user khi chưa tìm nguyên nhân.

Bài học từ dự án cũ: push thành công và Vercel Ready có thể khác thời điểm. [Managing deployments](https://vercel.com/docs/deployments/managing-deployments).

## 13. Rollback

- Web: chọn deployment ổn định trước để rollback/promote theo công cụ Vercel.
- Database: ưu tiên forward-fix; rollback web chỉ an toàn nếu schema còn tương thích.
- Schema change theo expand → migrate → contract; không drop cột đang dùng ngay.
- Backup/dump trước migration có rủi ro, lưu ở nơi riêng an toàn; không commit dump user.
- AI gặp lỗi: tắt AI_ENABLED, giữ nội dung cache và mọi chế độ offline/local game.
- Seed lỗi: sửa đúng IDs namespace seed, không truncate dữ liệu user.

## 14. Vận hành

Hằng tuần ở beta: xem lỗi Auth, failed AI batches, quota, cache hit ratio, DB size, số phiên/câu thực sự học. Theo dõi usage Supabase/Vercel riêng với Gemini.

Chủ tài khoản kiểm tra free tier và mục đích sử dụng hiện hành trước khi mở thương mại. Không ước tính số người dùng chịu tải chỉ từ số projects được tạo.
