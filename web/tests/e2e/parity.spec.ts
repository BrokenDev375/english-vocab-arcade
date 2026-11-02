import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import {
  computeAiCacheKey,
  CURRENT_PROMPT_VERSION,
  CURRENT_SCHEMA_VERSION,
} from "../../src/features/ai/cache-key";
import type { DialogueOutput } from "../../src/features/ai/schemas";

const fixture = readFileSync("vitest.integration.config.mts", "utf8");
const [, key] = [...fixture.matchAll(/"(eyJ[^"\r\n]+)"/g)].map(
  (match) => match[1],
);
const admin = createClient("http://127.0.0.1:54321", key, {
  auth: { persistSession: false },
});
const password = "Parity-Local-Only-123!";
const users: string[] = [],
  emails: string[] = [];
let inlineId = "",
  dialogueId = "",
  publicId = "",
  prefix = "";
let dialogue: DialogueOutput;
const checked = <
  T extends { data: unknown; error: { message: string } | null },
>(
  result: T,
): NonNullable<T["data"]> => {
  if (result.error) throw new Error(result.error.message);
  return result.data as NonNullable<T["data"]>;
};
async function login(page: Page, next: string, index = 0) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Địa chỉ Email").fill(emails[index]);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Đăng xuất", exact: true }),
  ).toBeVisible();
}
async function latest(setId: string, mode: string) {
  return checked(
    await admin
      .from("study_sessions")
      .select("*")
      .eq("set_id", setId)
      .eq("user_id", users[0])
      .eq("mode", mode)
      .order("started_at", { ascending: false })
      .limit(1),
  )[0];
}
test.beforeAll(async () => {
  prefix = `Parity ${Date.now()}`;
  for (const index of [0, 1]) {
    const email = `parity_${Date.now()}_${index}@example.com`;
    emails.push(email);
    const data = checked(
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      }),
    );
    if (!data.user) throw new Error("Missing user fixture");
    users.push(data.user.id);
  }
  const sets = checked(
    await admin
      .from("learning_sets")
      .insert([
        {
          owner_id: users[0],
          title: `${prefix} inline`,
          topic: "test",
          cefr_level: "A1",
          is_public: false,
        },
        {
          owner_id: users[0],
          title: `${prefix} dialogue`,
          topic: "test",
          cefr_level: "A1",
          is_public: false,
        },
      ])
      .select("id,title"),
  );
  inlineId = sets.find((set) => set.title.endsWith("inline"))!.id;
  dialogueId = sets.find((set) => set.title.endsWith("dialogue"))!.id;
  const publicSets = checked(
    await admin
      .from("learning_sets")
      .insert(
        Array.from({ length: 13 }, (_, index) => ({
          owner_id: users[0],
          title: `${prefix} public ${index}`,
          topic: "parity-public",
          cefr_level: "A1",
          is_public: true,
        })),
      )
      .select("id"),
  );
  publicId = publicSets[0].id;
  checked(
    await admin
      .from("vocabulary_cards")
      .insert(
        ["apple", "book"].map((term, position) => ({
          set_id: inlineId,
          term,
          meaning_vi: position ? "quyển sách" : "quả táo",
          part_of_speech: "noun",
          accepted_answers: [term],
          position,
        })),
      ),
  );
  const cardId = randomUUID();
  checked(
    await admin
      .from("vocabulary_cards")
      .insert({
        id: cardId,
        set_id: dialogueId,
        term: "apple",
        meaning_vi: "quả táo",
        part_of_speech: "noun",
        accepted_answers: ["apple"],
        position: 0,
      }),
  );
  const { content_revision } = checked(
    await admin
      .from("learning_sets")
      .select("content_revision")
      .eq("id", dialogueId)
      .single(),
  );
  dialogue = {
    title: "An apple after class",
    situationVi: "Hai người bạn trò chuyện về bữa ăn nhẹ.",
    level: "A1",
    usedCardIds: [cardId],
    turns: [
      {
        role: "A",
        cardId,
        textEn: "Would you like an apple?",
        textVi: "Bạn có muốn ăn một quả táo không?",
      },
      {
        role: "B",
        cardId,
        textEn: "Yes, I would like an apple.",
        textVi: "Có, mình muốn một quả táo.",
      },
      {
        role: "A",
        cardId,
        textEn: "Here is an apple for you.",
        textVi: "Đây là một quả táo cho bạn.",
      },
      {
        role: "B",
        cardId,
        textEn: "Thank you for the apple.",
        textVi: "Cảm ơn bạn về quả táo.",
      },
    ],
  };
  checked(
    await admin
      .from("ai_batches")
      .insert({
        user_id: users[0],
        set_id: dialogueId,
        mode: "dialogue",
        card_ids: [cardId],
        content_revision,
        cache_key: computeAiCacheKey({
          userId: users[0],
          setId: dialogueId,
          mode: "dialogue",
          contentRevision: content_revision,
          cards: [
            {
              id: cardId,
              term: "apple",
              meaningVi: "quả táo",
              partOfSpeech: "noun",
            },
          ],
          targetLevel: "A1",
        }),
        prompt_version: CURRENT_PROMPT_VERSION,
        schema_version: CURRENT_SCHEMA_VERSION,
        status: "ready",
        output: dialogue,
        model_id: "synthetic-fixture-no-provider",
      }),
  );
});
test.afterAll(async () => {
  for (const id of users) checked(await admin.auth.admin.deleteUser(id));
});

test("navbar search reaches all public results across pages without creator details", async ({
  page,
}) => {
  await login(page, "/dashboard");
  await page
    .getByRole("searchbox", { name: "Tìm kiếm học phần", exact: true })
    .fill(`${prefix} public`);
  await page
    .getByRole("searchbox", { name: "Tìm kiếm học phần", exact: true })
    .press("Enter");
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === "/explore" &&
      url.searchParams.get("q") === `${prefix} public`,
  );
  await expect(page.getByText("13 học phần", { exact: true })).toBeVisible();
  // Next preserves inactive routes in hidden DOM; assert the current accessible page.
  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(12);
  await page.getByRole("button", { name: "Sau", exact: true }).click();
  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(1);
  await expect(page.getByText(emails[0], { exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Trình độ" }).selectOption("B1");
  await expect(
    page.getByText("Không tìm thấy học phần phù hợp", { exact: true }),
  ).toBeVisible();
});

test("set hub embeds flashcards, preserves progress, and offers all learning modes", async ({
  page,
}) => {
  await login(page, `/sets/${inlineId}`);
  await expect(page.locator("#flashcard-arena")).toBeVisible();
  await expect(page.getByRole("link", { name: /Hội thoại/ })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Word Blaster/ }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đã nhớ (2)", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await latest(inlineId, "flashcard"))?.state.clientState?.currentIndex,
    )
    .toBe(1);
  await page.reload();
  await expect(
    page.getByText("Tiếp tục tiến độ học trước đó", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("#flashcard-arena h2", { hasText: "book" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đã nhớ (2)", exact: true }).click();
  await expect
    .poll(async () => (await latest(inlineId, "flashcard"))?.status)
    .toBe("completed");
  expect(
    checked(
      await admin
        .from("study_attempts")
        .select("id")
        .eq("session_id", (await latest(inlineId, "flashcard")).id),
    ),
  ).toHaveLength(2);
});

test("dialogue role practice survives reload, grades on server, and changes role", async ({
  page,
}) => {
  await login(page, `/sets/${dialogueId}/dialogue`);
  await expect(
    page.getByRole("heading", { name: "Hội thoại tiếng Anh", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Câu trả lời hội thoại", { exact: true })
    .fill(dialogue.turns[0].textEn);
  await page
    .getByRole("button", { name: "Kiểm tra câu trả lời", exact: true })
    .click();
  await expect(page.getByText("Khớp câu mẫu!", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Khớp câu mẫu!", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Lượt tiếp theo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Lượt tiếp theo", exact: true })
    .click();
  await page
    .getByLabel("Câu trả lời hội thoại", { exact: true })
    .fill(dialogue.turns[2].textEn);
  await page
    .getByRole("button", { name: "Kiểm tra câu trả lời", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Lượt tiếp theo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Hoàn thành hội thoại", exact: true })
    .click();
  await expect
    .poll(async () => (await latest(dialogueId, "dialogue"))?.status)
    .toBe("completed");
  const attempts = checked(
    await admin
      .from("study_attempts")
      .select("is_correct")
      .eq("session_id", (await latest(dialogueId, "dialogue")).id),
  );
  expect(attempts).toHaveLength(2);
  expect(attempts.every((item) => item.is_correct)).toBe(true);
  await page.getByRole("button", { name: "Luyện vai B", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await latest(dialogueId, "dialogue"))?.state.clientState?.role,
    )
    .toBe("B");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Luyện vai B", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("another reader cannot see the owner's edit or delete controls", async ({
  page,
}) => {
  await login(page, `/sets/${publicId}`, 1);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sửa", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Xóa học phần", exact: true }),
  ).toHaveCount(0);
});

test("mobile homepage and navigation search fit a 360px screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Mở menu điều hướng", exact: true })
    .click();
  await page
    .getByRole("searchbox", {
      name: "Tìm kiếm học phần trên điện thoại",
      exact: true,
    })
    .fill(`${prefix} public`);
  await page
    .getByRole("searchbox", {
      name: "Tìm kiếm học phần trên điện thoại",
      exact: true,
    })
    .press("Enter");
  await expect(page.getByText("13 học phần", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
