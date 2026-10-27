import { describe, it, expect, beforeAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.generated";
import {
  listLearningSets,
  getLearningSetById,
  createLearningSet,
  updateLearningSet,
  deleteLearningSet,
  listSetCards,
  insertSetCards,
  updateSetCard,
  deleteSetCard,
} from "@/features/sets/sets.repository";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

describe("T05 - Set/card CRUD and explore (E02, Isolation, Cursor Pagination 1,001 cards)", () => {
  let adminClient: SupabaseClient<Database>;
  let anonClient: SupabaseClient<Database>;
  let clientA: SupabaseClient<Database>;
  let clientB: SupabaseClient<Database>;

  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    adminClient = createClient<Database>(SUPABASE_URL, SERVICE_KEY);
    anonClient = createClient<Database>(SUPABASE_URL, ANON_KEY);

    // Create unique test users A and B
    const emailA = `sets_user_a_${Date.now()}@example.com`;
    const emailB = `sets_user_b_${Date.now()}@example.com`;
    const password = "Password123!Secure";

    const { data: createdA, error: errA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Tác giả A" },
    });
    if (errA || !createdA.user) throw new Error(`Failed to create User A: ${errA?.message}`);
    userAId = createdA.user.id;

    const { data: createdB, error: errB } = await adminClient.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Học viên B" },
    });
    if (errB || !createdB.user) throw new Error(`Failed to create User B: ${errB?.message}`);
    userBId = createdB.user.id;

    // Sign in User A client
    clientA = createClient<Database>(SUPABASE_URL, ANON_KEY);
    const { data: authA } = await clientA.auth.signInWithPassword({
      email: emailA,
      password,
    });
    expect(authA.session).not.toBeNull();

    // Sign in User B client
    clientB = createClient<Database>(SUPABASE_URL, ANON_KEY);
    const { data: authB } = await clientB.auth.signInWithPassword({
      email: emailB,
      password,
    });
    expect(authB.session).not.toBeNull();
  });

  it("E02 Part 1: User A creates a private set and adds 20 cards", async () => {
    // 1. User A creates private set
    const setA = await createLearningSet(clientA, {
      ownerId: userAId,
      title: "Bộ từ vựng Du lịch Khách sạn (Private)",
      description: "20 từ vựng căn bản A1-A2 khi nhận phòng khách sạn",
      cefrLevel: "A1",
      topic: "Du lịch",
      isPublic: false,
    });

    expect(setA.id).toBeDefined();
    expect(setA.owner_id).toBe(userAId);
    expect(setA.is_public).toBe(false);
    expect(setA.content_revision).toBe(1);

    // 2. User A inserts 20 cards
    const initial20Cards = Array.from({ length: 20 }, (_, idx) => ({
      term: `hotel_word_${idx + 1}`,
      meaningVi: `nghĩa khách sạn ${idx + 1}`,
      partOfSpeech: "noun" as const,
      ipa: `/wɜːd_${idx + 1}/`,
      cefrLevel: "A1" as const,
      exampleEn: `This is hotel word number ${idx + 1}.`,
      exampleVi: `Đây là từ khách sạn số ${idx + 1}.`,
      position: idx,
      acceptedAnswers: [`hotel_word_${idx + 1}`],
    }));

    const inserted = await insertSetCards(clientA, setA.id, initial20Cards);
    expect(inserted).toHaveLength(20);

    // 3. User B and Anon cannot read User A's private set or cards
    const setQueryB = await getLearningSetById(clientB, setA.id);
    expect(setQueryB).toBeNull();

    const setQueryAnon = await getLearningSetById(anonClient, setA.id);
    expect(setQueryAnon).toBeNull();

    const { cards: cardsQueryB } = await listSetCards(clientB, setA.id);
    expect(cardsQueryB).toHaveLength(0);

    const { cards: cardsQueryAnon } = await listSetCards(anonClient, setA.id);
    expect(cardsQueryAnon).toHaveLength(0);
  });

  it("E02 Part 2: User A updates a card, bumps revision, single-card edit without delete-all", async () => {
    // Create another set for this test
    const set = await createLearningSet(clientA, {
      ownerId: userAId,
      title: "Test Single Card Edit",
      cefrLevel: "A2",
      topic: "Ẩm thực",
      isPublic: false,
    });

    const cards = await insertSetCards(clientA, set.id, [
      {
        term: "delicious",
        meaningVi: "ngon",
        partOfSpeech: "adjective",
        position: 0,
      },
      {
        term: "beverage",
        meaningVi: "đồ uống",
        partOfSpeech: "noun",
        position: 1,
      },
    ]);

    expect(cards).toHaveLength(2);
    const cardToEdit = cards[0];
    const initialRevision = (await getLearningSetById(clientA, set.id))?.content_revision || 1;

    // Update single card
    const updatedCard = await updateSetCard(clientA, cardToEdit.id, {
      meaningVi: "ngon miệng, tuyệt vời",
      exampleEn: "The soup is delicious.",
    });

    expect(updatedCard.meaning_vi).toBe("ngon miệng, tuyệt vời");
    expect(updatedCard.example_en).toBe("The soup is delicious.");

    // Verify other card was untouched (IDs and length preserved)
    const { cards: remainingCards } = await listSetCards(clientA, set.id);
    expect(remainingCards).toHaveLength(2);
    expect(remainingCards.find((c) => c.id === cards[1].id)?.term).toBe("beverage");

    // Verify set revision increased
    const updatedSet = await getLearningSetById(clientA, set.id);
    expect(updatedSet?.content_revision).toBeGreaterThan(initialRevision);
  });

  it("E02 Part 3: User B cannot modify or delete User A's set or cards", async () => {
    const setA = await createLearningSet(clientA, {
      ownerId: userAId,
      title: "Set thuộc sở hữu User A",
      cefrLevel: "B1",
      topic: "Công việc",
      isPublic: true, // even if public, B cannot edit
    });

    const cards = await insertSetCards(clientA, setA.id, [
      {
        term: "deadline",
        meaningVi: "hạn chót",
        partOfSpeech: "noun",
        position: 0,
      },
    ]);

    // B tries to update User A's set title
    await expect(
      updateLearningSet(clientB, setA.id, {
        title: "User B đã hack tiêu đề",
      })
    ).rejects.toThrow();

    // B tries to update User A's card
    await expect(
      updateSetCard(clientB, cards[0].id, {
        term: "hacked_word",
      })
    ).rejects.toThrow();

    // B tries to delete User A's card
    // Note: delete on RLS returns 0 rows affected, shouldn't delete card
    await clientB.from("vocabulary_cards").delete().eq("id", cards[0].id);

    // Verify card still exists
    const { cards: cardsAfter } = await listSetCards(clientA, setA.id);
    expect(cardsAfter).toHaveLength(1);
    expect(cardsAfter[0].term).toBe("deadline");
  });

  it("E02 Part 4: Publishing set allows B and Anon to view, Explore NEVER exposes author profiles", async () => {
    const uniqueTitle = `Học phần chuẩn bị Public ${Date.now()}`;
    // 1. User A creates private set
    const set = await createLearningSet(clientA, {
      ownerId: userAId,
      title: uniqueTitle,
      cefrLevel: "A1",
      topic: "Giao tiếp",
      isPublic: false,
    });

    await insertSetCards(clientA, set.id, [
      { term: "hello", meaningVi: "xin chào", partOfSpeech: "other", position: 0 },
    ]);

    // Anon cannot see it
    let exploreSets = await listLearningSets(anonClient, { scope: "explore", search: uniqueTitle });
    expect(exploreSets.sets).toHaveLength(0);

    // 2. User A publishes set
    await updateLearningSet(clientA, set.id, { isPublic: true });

    // 3. Anon can now find it on explore
    exploreSets = await listLearningSets(anonClient, { scope: "explore", search: uniqueTitle });
    expect(exploreSets.sets).toHaveLength(1);

    const publicSet = exploreSets.sets[0];
    expect(publicSet.title).toBe(uniqueTitle);
    expect(publicSet.card_count).toBe(1);

    // CRITICAL PRIVACY RULE: Explore result MUST NOT have author profiles, name, username, or avatar
    const record = publicSet as unknown as Record<string, unknown>;
    expect(record.creator_name).toBeUndefined();
    expect(record.username).toBeUndefined();
    expect(record.avatar_url).toBeUndefined();
    expect(record.profiles).toBeUndefined();
    expect(record.author).toBeUndefined();
  });

  it("Revision guard: Reject update if expectedRevision does not match", async () => {
    const set = await createLearningSet(clientA, {
      ownerId: userAId,
      title: "Optimistic Revision Guard Test",
      cefrLevel: "B1",
      topic: "Kiểm thử",
      isPublic: false,
    });

    // Update with wrong revision
    await expect(
      updateLearningSet(clientA, set.id, {
        title: "Tiêu đề mới",
        expectedRevision: 999, // Mismatched!
      })
    ).rejects.toThrow();

    // Update with correct revision
    const updated = await updateLearningSet(clientA, set.id, {
      title: "Tiêu đề cập nhật hợp lệ",
      expectedRevision: set.content_revision,
    });

    expect(updated.title).toBe("Tiêu đề cập nhật hợp lệ");
  });

  it("Cursor pagination handles 1,001 cards correctly and in stable order", async () => {
    // Create large test set
    const largeSet = await createLearningSet(clientA, {
      ownerId: userAId,
      title: "Large Set 1,001 Cards Pagination Test",
      cefrLevel: "A1",
      topic: "Quy mô lớn",
      isPublic: true,
    });

    // Insert 1,001 cards in 11 batches (10 x 100 + 1 x 1)
    const totalToInsert = 1001;
    const batchSize = 100;
    const numBatches = Math.ceil(totalToInsert / batchSize);

    for (let b = 0; b < numBatches; b++) {
      const startIdx = b * batchSize;
      const count = Math.min(batchSize, totalToInsert - startIdx);
      const batchCards = Array.from({ length: count }, (_, i) => {
        const pos = startIdx + i;
        return {
          term: `word_${pos}`,
          meaningVi: `nghĩa số ${pos}`,
          partOfSpeech: "noun" as const,
          position: pos,
          acceptedAnswers: [`word_${pos}`],
        };
      });

      await insertSetCards(clientA, largeSet.id, batchCards);
    }

    // Now retrieve all cards using cursor pagination with page size 200
    const retrievedCards: Array<{ id: string; position: number; term: string }> = [];
    let cursor: { position: number; id: string } | null = null;
    let pageCount = 0;

    do {
      pageCount++;
      const res = await listSetCards(clientA, largeSet.id, {
        cursorPosition: cursor ? cursor.position : undefined,
        cursorId: cursor ? cursor.id : undefined,
        limit: 200,
      });

      retrievedCards.push(...res.cards);
      cursor = res.nextCursor;
    } while (cursor !== null);

    // Verify all 1,001 cards were retrieved
    expect(retrievedCards).toHaveLength(1001);
    expect(pageCount).toBe(6); // 200 * 5 + 1 = 6 pages

    // Verify stable ascending order by position
    for (let i = 0; i < retrievedCards.length; i++) {
      expect(retrievedCards[i].position).toBe(i);
      expect(retrievedCards[i].term).toBe(`word_${i}`);
    }

    // Verify no duplicates
    const uniqueIds = new Set(retrievedCards.map((c) => c.id));
    expect(uniqueIds.size).toBe(1001);
  }, 45000); // 45s timeout for 1,001 items insertion and pagination

  it("User A can delete their own card and set cleanly", async () => {
    expect(userBId).toBeDefined();

    const set = await createLearningSet(clientA, {
      ownerId: userAId,
      title: "Set to be deleted",
      cefrLevel: "A1",
      topic: "Xóa",
      isPublic: false,
    });

    const cards = await insertSetCards(clientA, set.id, [
      { term: "temp_word", meaningVi: "từ tạm", partOfSpeech: "noun" },
    ]);
    expect(cards).toHaveLength(1);

    // Delete card
    const cardDeleted = await deleteSetCard(clientA, cards[0].id);
    expect(cardDeleted).toBe(true);

    const { cards: remaining } = await listSetCards(clientA, set.id);
    expect(remaining).toHaveLength(0);

    // Delete set
    const setDeleted = await deleteLearningSet(clientA, set.id);
    expect(setDeleted).toBe(true);

    const fetchedSet = await getLearningSetById(clientA, set.id);
    expect(fetchedSet).toBeNull();
  });
});
