import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { computeAiCacheKey } from "../../src/features/ai/cache-key";

const fixture = readFileSync("vitest.integration.config.mts", "utf8");
const [, serviceKey] = [...fixture.matchAll(/"(eyJ[^"\r\n]+)"/g)].map(match => match[1]);
const admin = createClient("http://127.0.0.1:54321", serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const password = "LocalE2E-Only-Strong123!";
let users: string[] = [];
let emails: string[] = [];
let smallSet = "", largeSet = "", aiSet = "", matchSet = "";
const checked = <T extends { data: unknown; error: { message: string } | null }>(result: T): NonNullable<T["data"]> => { if (result.error) throw new Error(result.error.message); return result.data as NonNullable<T["data"]>; };
async function makeSet(title: string, words: string[]) {
  const set = checked(await admin.from("learning_sets").insert({ owner_id: users[0], title, cefr_level: "A1", topic: "synthetic-e2e", is_public: false }).select().single());
  const cards = words.map((term, position) => ({ id: randomUUID(), set_id: set.id, term, meaning_vi: `nghĩa ${term}`, part_of_speech: "noun", position, accepted_answers: [term] }));
  checked(await admin.from("vocabulary_cards").insert(cards));
  return { set, cards };
}
async function login(page: Page, user = 0, next = "/dashboard") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Địa chỉ Email").fill(emails[user]); await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đăng xuất", exact: true }).first()).toBeVisible();
}
async function session(mode: string, setId: string) {
  const rows = checked(await admin.from("study_sessions").select("*").eq("user_id", users[0]).eq("set_id", setId).eq("mode", mode).order("started_at", { ascending: false }).limit(1));
  return rows[0];
}
test.beforeAll(async () => {
  const stamp = Date.now(); emails = [0, 1].map(i => `eva_e2e_${stamp}_${i}@example.com`);
  for (const email of emails) { const created = checked(await admin.auth.admin.createUser({ email, password, email_confirm: true })); if (!created.user) throw new Error("Fixture creation failed"); users.push(created.user.id); }
  smallSet = (await makeSet("E2E One Word", ["apple"])).set.id;
  const alphabetic = (i: number) => "word" + String.fromCharCode(97 + Math.floor(i / 676), 97 + Math.floor(i / 26) % 26, 97 + i % 26);
  largeSet = (await makeSet("E2E 1001 Words", Array.from({ length: 1001 }, (_, i) => alphabetic(i)))).set.id;
  matchSet = (await makeSet("E2E Seven Pairs", ["apple", "book", "chair", "desk", "egg", "fish", "garden"])).set.id;
  const ai = await makeSet("E2E AI Cached", ["apple"]); aiSet = ai.set.id;
  const { content_revision } = checked(await admin.from("learning_sets").select("content_revision").eq("id", aiSet).single());
  const card = ai.cards[0];
  const cardInput = { id: card.id, term: card.term, meaningVi: card.meaning_vi, partOfSpeech: card.part_of_speech };
  for (const mode of ["grammar", "reading", "translation"] as const) {
    const output = mode === "grammar" ? { exercises: [{ cardId: card.id, sentenceEn: "I eat an apple", sentenceVi: "Tôi ăn một quả táo", tokens: ["I", "eat", "an", "apple"], acceptedTokenOrders: [["I", "eat", "an", "apple"]], hintVi: "Bắt đầu bằng I", explanationVi: "Mẫu câu hiện tại đơn." }] } : mode === "translation" ? { exercises: [{ cardId: card.id, promptVi: "Tôi ăn một quả táo.", referenceEn: "I eat an apple", acceptedAnswers: ["I eat an apple"], requiredWordForms: ["apple"], hints: [], explanationVi: "Mẫu dịch tham khảo cho bài kiểm thử." }] } : { title: "An apple", level: "A1", passageEn: "I eat an apple every morning. This is a synthetic reading exercise used only for local testing.", translationVi: "Tôi ăn một quả táo mỗi sáng. Đây là đoạn văn tổng hợp chỉ dùng để kiểm thử trên máy.", usedCardIds: [card.id], questions: Array.from({ length: 4 }, (_, i) => ({ id: `q${i}`, questionEn: "What do I eat?", options: ["An apple", "A book", "A fish", "A chair"], correctIndex: 0, explanationVi: "Bài đọc nhắc đến một quả táo." })) };
    checked(await admin.from("ai_batches").insert({ user_id: users[0], set_id: aiSet, mode, card_ids: [card.id], content_revision, cache_key: computeAiCacheKey({ userId: users[0], setId: aiSet, mode, contentRevision: content_revision, cards: [cardInput], targetLevel: "A1" }), prompt_version: "2026-10-v1", schema_version: "2026-10-v1", status: "ready", output, model_id: "synthetic-fixture-no-provider" }));
  }
});
test.afterAll(async () => {
  for (const id of users) {
    for (const table of ["ai_usage_daily", "ai_rate_buckets"]) checked(await admin.from(table).delete().eq("scope_key", `user:${id}`));
    checked(await admin.auth.admin.deleteUser(id));
  }
  users = [];
});

test("UI login, create set, learn, reload, offline retry, completion and account switch", async ({ page }) => {
  await login(page);
  await page.goto("/sets/new");
  await page.getByRole("button", { name: "Xóa thẻ 2", exact: true }).click();
  await page.getByLabel("Tiêu đề học phần *", { exact: true }).fill("E2E Created From Browser"); await page.getByLabel("Chủ đề *", { exact: true }).fill("e2e");
  await page.getByLabel("Từ tiếng Anh *", { exact: true }).first().fill("apple"); await page.getByLabel("Nghĩa tiếng Việt *", { exact: true }).first().fill("quả táo");
  await page.getByRole("button", { name: /Lưu học phần/ }).click();
  await expect(page).toHaveURL(/\/sets\/[0-9a-f-]+$/);
  const setId = page.url().split("/").at(-1)!;
  await page.goto(`/sets/${setId}/learn`);
  const input = page.locator('input[type="text"]'); await expect(input).toBeVisible();
  let block = true;
  await page.route("**/api/attempts", route => block ? route.abort("failed") : route.continue());
  await input.fill("apple"); await page.getByRole("button", { name: /Kiểm tra|Trả lời/ }).click();
  await expect(page.getByText("Bạn trả lời: apple")).toBeVisible();
  await page.reload(); await expect(page.getByText("Bạn trả lời: apple")).toBeVisible();
  block = false;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(async () => checked(await admin.from("study_attempts").select("id").eq("user_id", users[0])).length).toBe(1);
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await expect.poll(async () => (await session("learn", setId))?.status).toBe("completed");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).first().click();
  await expect(page).toHaveURL(/\/login/);
  expect(await page.evaluate(user => Object.keys(localStorage).filter(key => key.startsWith(`eva:v1:${user}:`)), users[0])).toEqual([]);
  await login(page, 1, `/sets/${setId}/learn`);
  await expect(page.getByRole("alert").filter({ hasText: /quyền|đầy đủ thẻ/ }).first()).toBeVisible();
});

test("1001 cards load in detail and Arcade; page-two errors do not start a partial game", async ({ page }) => {
  await login(page, 0, `/sets/${largeSet}`);
  await expect(page.getByText("wordbmm", { exact: true }).first()).toBeVisible();
  await page.goto(`/sets/${largeSet}/arcade`);
  await expect(page.getByRole("button", { name: "Bắt đầu chơi ngay" })).toBeVisible();
  await expect.poll(async () => (await session("arcade_typing", largeSet))?.content_snapshot.length).toBe(1001);
  await page.route("**/api/sets/*/cards?*", route => new URL(route.request().url()).searchParams.has("cursorId") ? route.fulfill({ status: 500, contentType: "application/json", body: "{}" }) : route.continue());
  await page.reload();
  await expect(page.getByRole("alert").filter({ hasText: "đầy đủ thẻ" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bắt đầu chơi ngay" })).toHaveCount(0);
});

for (const arcadeMode of ["typing", "recall"] as const) test(`Arcade ${arcadeMode} produces one hit and reload restores the chosen mode`, async ({ page }) => {
  await login(page, 0, `/sets/${matchSet}/arcade?mode=${arcadeMode}`);
  await page.getByRole("button", { name: "Bắt đầu chơi ngay" }).click();
  await expect.poll(async () => (await session(`arcade_${arcadeMode}`, matchSet))?.state.clientState?.gameState?.activeTargets?.length || 0).toBeGreaterThan(0);
  const state = await session(`arcade_${arcadeMode}`, matchSet);
  const word = state.state.clientState.gameState.activeTargets[0].canonicalAnswer;
  await page.locator('input[type="text"]').fill(word);
  await expect.poll(async () => checked(await admin.from("study_attempts").select("id").eq("session_id", state.id).eq("attempt_kind", "game_hit")).length).toBe(1);
  await page.reload();
  await expect(page.locator("canvas")).toBeVisible();
  expect((await session(`arcade_${arcadeMode}`, matchSet)).state.clientState.gameState.mode).toBe(arcadeMode);
  await expect.poll(async () => (await session(`arcade_${arcadeMode}`, matchSet))?.status).toBe("paused");
  expect(checked(await admin.from("study_attempts").select("id").eq("session_id", state.id).eq("attempt_kind", "game_hit"))).toHaveLength(1);
});

test("Match preserves the stage and matched pairs across reload", async ({ page }) => {
  await login(page, 0, `/sets/${matchSet}/match`);
  await expect(page.getByText(/Chặng 1\/2/)).toBeVisible();
  const saved = await session("match", matchSet);
  await expect.poll(async () => (await session("match", matchSet))?.state.clientState?.plan?.stages?.length || 0).toBe(2);
  const plan = (await session("match", matchSet)).state.clientState.plan;
  for (const card of plan.stages[0].cards) { await page.getByRole("button", { name: card.term, exact: true }).click(); await page.getByRole("button", { name: card.meaningVi, exact: true }).click(); }
  await page.getByRole("button", { name: "Chặng tiếp theo", exact: true }).click();
  await page.reload(); await expect(page.getByText(/Chặng 2\/2/)).toBeVisible();
  expect((await session("match", matchSet)).id).toBe(saved.id);
});

for (const mode of ["grammar", "reading", "translate"] as const) test(`cached ${mode} questions are graded server-side and complete`, async ({ page }) => {
  await login(page, 0, `/sets/${aiSet}/${mode}`);
  if (mode === "grammar") { for (const word of ["I", "eat", "an", "apple"]) await page.getByRole("button", { name: word, exact: true }).click(); await page.getByRole("button", { name: "Kiểm tra", exact: true }).click(); }
  else if (mode === "translate") { await page.getByLabel("Bản dịch tiếng Anh").fill("I eat an apple"); await page.getByRole("button", { name: "Kiểm tra", exact: true }).click(); }
  else { for (let i = 0; i < 4; i++) { await page.getByRole("button", { name: "An apple", exact: true }).click(); if (i < 3) await page.getByRole("button", { name: "Câu tiếp theo", exact: true }).click(); } }
  await expect(page.getByText("Đã hoàn thành bài tập.")).toBeVisible();
  await expect.poll(async () => (await session(mode, aiSet))?.status).toBe("completed");
  const recorded = checked(await admin.from("study_attempts").select("is_correct").eq("session_id", (await session(mode, aiSet)).id));
  expect(recorded.every(row => row.is_correct)).toBe(true);
});

test("cross-origin mutations and access to another user's private session are rejected", async ({ page }) => {
  await login(page, 1);
  const foreign = await page.request.post("/api/sessions", { headers: { Origin: "http://127.0.0.1:3197" }, data: { setId: smallSet, mode: "learn" } });
  expect(foreign.status()).toBe(404);
  const crossOrigin = await page.request.post("/api/sessions", { headers: { Origin: "https://invalid.example" }, data: { setId: smallSet, mode: "learn" } });
  expect(crossOrigin.status()).toBe(403);
});

test("test mode resumes an answered question and records completion", async ({ page }) => {
  await login(page, 0, `/sets/${smallSet}/test`);
  await page.getByPlaceholder("Gõ từ tiếng Anh tương ứng...").fill("apple");
  await page.getByRole("button", { name: "Kiểm tra đáp án", exact: true }).click();
  await page.reload(); await expect(page.getByText("Bạn trả lời: apple")).toBeVisible();
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await expect.poll(async () => (await session("test", smallSet))?.status).toBe("completed");
});

test("flashcards resume the next card and complete without counting the same card twice", async ({ page }) => {
  await login(page, 0, `/sets/${matchSet}/flashcards`);
  await page.getByRole("button", { name: "Đã nhớ (2)", exact: true }).click();
  await page.reload(); await expect(page.getByText("2 / 7", { exact: true })).toBeVisible();
  for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "Đã nhớ (2)", exact: true }).click();
  await expect(page.getByText("Đã ôn 7 thẻ.")).toBeVisible();
  await expect.poll(async () => (await session("flashcard", matchSet))?.status).toBe("completed");
});

test("dictation records its result and a new round survives reload", async ({ page }) => {
  await login(page, 0, `/sets/${smallSet}/dictation`);
  await page.getByPlaceholder("Gõ từ bạn nghe được...").fill("apple");
  await page.getByRole("button", { name: "Kiểm tra từ", exact: true }).click();
  await expect.poll(async () => (await session("dictation", smallSet))?.status).toBe("completed");
  const firstId = (await session("dictation", smallSet)).id;
  await page.getByRole("button", { name: /Làm lại|Luyện lại/ }).click();
  await expect.poll(async () => (await session("dictation", smallSet))?.id).not.toBe(firstId);
  await page.reload(); await expect(page.getByPlaceholder("Gõ từ bạn nghe được...")).toHaveValue("");
});

test("speaking keyboard fallback records the same server grade", async ({ page }) => {
  await login(page, 0, `/sets/${smallSet}/speak`);
  await page.getByRole("button", { name: "Không tiện nói? Chuyển sang gõ kiểm tra", exact: true }).click();
  await page.getByPlaceholder("Gõ từ để kiểm tra nhận diện...").fill("apple");
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
  await expect.poll(async () => (await session("speak", smallSet))?.status).toBe("completed");
  const recorded = checked(await admin.from("study_attempts").select("is_correct").eq("session_id", (await session("speak", smallSet)).id));
  expect(recorded).toHaveLength(1); expect(recorded[0].is_correct).toBe(true);
});

test("expired session metadata is refreshed without logging the user out", async ({ page, context }) => {
  await login(page);
  const cookies = (await context.cookies()).filter(cookie => /^sb-.*-auth-token(?:\.\d+)?$/.test(cookie.name)).sort((a,b) => a.name.localeCompare(b.name));
  expect(cookies.length).toBeGreaterThan(0);
  const baseName = cookies[0].name.replace(/\.\d+$/, "");
  const encoded = cookies.map(cookie => cookie.value).join("");
  const stored = JSON.parse(Buffer.from(encoded.slice("base64-".length), "base64url").toString("utf8"));
  stored.expires_at = 0; stored.expires_in = 0;
  const expired = "base64-" + Buffer.from(JSON.stringify(stored)).toString("base64url");
  await context.clearCookies({ name: /^sb-.*-auth-token(?:\.\d+)?$/ });
  const chunks = expired.match(/.{1,3180}/g)!;
  await context.addCookies(chunks.map((value, i) => ({ ...cookies[0], name: chunks.length > 1 ? `${baseName}.${i}` : baseName, value })));
  await page.reload();
  await expect(page.getByRole("button", { name: "Đăng xuất", exact: true }).first()).toBeVisible();
  const refreshed = (await context.cookies()).filter(cookie => cookie.name === baseName || cookie.name.startsWith(baseName + ".")).sort((a,b) => a.name.localeCompare(b.name)).map(cookie => cookie.value).join("");
  expect(JSON.parse(Buffer.from(refreshed.slice(7), "base64url").toString("utf8")).expires_at).toBeGreaterThan(Date.now() / 1000);
});

test("recovery confirmation and password reset work through the browser", async ({ page }) => {
  const generated = checked(await admin.auth.admin.generateLink({ type: "recovery", email: emails[0] }));
  const token = generated.properties?.hashed_token;
  if (!token) throw new Error("Recovery fixture missing");
  await page.goto(`/auth/confirm?type=recovery&token_hash=${encodeURIComponent(token)}&next=/reset-password`);
  await expect(page).toHaveURL(/\/reset-password$/);
  const nextPassword = "LocalE2E-New-Only-Strong123!";
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill(nextPassword);
  await page.getByLabel("Xác nhận mật khẩu mới", { exact: true }).fill(nextPassword);
  await page.getByRole("button", { name: "Lưu mật khẩu mới", exact: true }).click();
  await expect(page.getByText("Mật khẩu đã được cập nhật thành công! Đang chuyển hướng...")).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).first().click();
  await page.getByLabel("Địa chỉ Email").fill(emails[0]); await page.getByLabel("Mật khẩu", { exact: true }).fill(nextPassword);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đăng xuất", exact: true }).first()).toBeVisible();
});
