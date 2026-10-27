import { describe, it, expect, beforeAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.generated";
import {
  createLearningSet,
  listSetCards,
  insertSetCards,
} from "@/features/sets/sets.repository";
import {
  chunkValidatedCards,
  buildDeterministicImportKey,
} from "@/features/sets/import/import-chunker";
import type { ValidatedCard } from "@/features/sets/import/import-validator";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

describe("T06 Integration Tests - Import Flow, D14 Idempotency, and Chunking", () => {
  let adminClient: SupabaseClient<Database>;
  let clientA: SupabaseClient<Database>;
  let clientB: SupabaseClient<Database>;

  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    adminClient = createClient<Database>(SUPABASE_URL, SERVICE_KEY);

    const emailA = `import_user_a_${Date.now()}@example.com`;
    const emailB = `import_user_b_${Date.now()}@example.com`;
    const password = "Password123!Secure";

    const { data: createdA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Import User A" },
    });
    userAId = createdA.user!.id;

    const { data: createdB } = await adminClient.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Import User B" },
    });
    userBId = createdB.user!.id;

    clientA = createClient<Database>(SUPABASE_URL, ANON_KEY);
    await clientA.auth.signInWithPassword({ email: emailA, password });

    clientB = createClient<Database>(SUPABASE_URL, ANON_KEY);
    await clientB.auth.signInWithPassword({ email: emailB, password });
  });

  it("D14: Duplicate import chunks with same import_key do NOT duplicate cards", async () => {
    expect(userBId).toBeDefined();

    const set = await createLearningSet(clientA, {
      ownerId: userAId,
      title: "Test D14 Import Key Deduplication",
      cefrLevel: "A1",
      topic: "Nhập khẩu",
      isPublic: false,
    });

    const batchId = `batch_${Date.now()}`;
    const cardInputs: ValidatedCard[] = [
      {
        term: "laptop",
        meaningVi: "máy tính xách tay",
        partOfSpeech: "noun",
        position: 0,
        originalRowNumber: 2,
        acceptedAnswers: ["laptop"],
      },
      {
        term: "keyboard",
        meaningVi: "bàn phím",
        partOfSpeech: "noun",
        position: 1,
        originalRowNumber: 3,
        acceptedAnswers: ["keyboard"],
      },
    ];

    const chunks = chunkValidatedCards(cardInputs, batchId, 0);
    expect(chunks).toHaveLength(1);

    // First insert
    const inserted1 = await insertSetCards(clientA, set.id, chunks[0].cards);
    expect(inserted1).toHaveLength(2);

    const { cards: afterFirst } = await listSetCards(clientA, set.id);
    expect(afterFirst).toHaveLength(2);

    // Simulated retry: exact same chunk with same import_key
    // In PostgreSQL with partial unique index idx_cards_import_key, inserting the same import_key must fail
    await expect(insertSetCards(clientA, set.id, chunks[0].cards)).rejects.toThrow(
      /duplicate key value violates unique constraint|idx_cards_import_key/i
    );

    // Verify card count is STILL 2 (no duplicate cards were created)
    const { cards: afterRetry } = await listSetCards(clientA, set.id);
    expect(afterRetry).toHaveLength(2);
  });

  it("Multi-chunk batch import inserts 150 cards cleanly across 2 chunks", async () => {
    const set = await createLearningSet(clientA, {
      ownerId: userAId,
      title: "Multi-chunk 150 Cards Import",
      cefrLevel: "A2",
      topic: "Từ vựng mở rộng",
      isPublic: false,
    });

    const mock150Cards: ValidatedCard[] = Array.from({ length: 150 }, (_, i) => ({
      term: `vocabulary_${i + 1}`,
      meaningVi: `nghĩa số ${i + 1}`,
      partOfSpeech: "noun" as const,
      position: i,
      originalRowNumber: i + 2,
      acceptedAnswers: [`vocabulary_${i + 1}`],
    }));

    const batchId = `batch_150_${Date.now()}`;
    const chunks = chunkValidatedCards(mock150Cards, batchId, 0);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].cards).toHaveLength(100);
    expect(chunks[1].cards).toHaveLength(50);

    // Insert chunk 1
    const resChunk1 = await insertSetCards(clientA, set.id, chunks[0].cards);
    expect(resChunk1).toHaveLength(100);

    // Insert chunk 2
    const resChunk2 = await insertSetCards(clientA, set.id, chunks[1].cards);
    expect(resChunk2).toHaveLength(50);

    // Verify total cards in set
    const { cards: allCards } = await listSetCards(clientA, set.id, { limit: 200 });
    expect(allCards).toHaveLength(150);
  });

  it("User B cannot import cards into User A's set", async () => {
    const setA = await createLearningSet(clientA, {
      ownerId: userAId,
      title: "User A Private Set",
      cefrLevel: "B1",
      topic: "Bảo mật",
      isPublic: false,
    });

    const card = {
      term: "intruder",
      meaningVi: "kẻ xâm nhập",
      partOfSpeech: "noun" as const,
      position: 0,
      importKey: buildDeterministicImportKey("hacker_batch", 0, "intruder"),
    };

    // User B tries to insert card into User A's set
    await expect(insertSetCards(clientB, setA.id, [card])).rejects.toThrow();

    // Verify User A's set remains empty
    const { cards } = await listSetCards(clientA, setA.id);
    expect(cards).toHaveLength(0);
  });
});
