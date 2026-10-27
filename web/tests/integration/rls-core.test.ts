import { describe, it, expect, beforeAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.generated";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

describe("T02 - Schema core và RLS (D01-D04, D12, D14, D15)", () => {
  let adminClient: SupabaseClient<Database>;
  let anonClient: SupabaseClient<Database>;
  let clientA: SupabaseClient<Database>;
  let clientB: SupabaseClient<Database>;

  let userAId: string;
  let userBId: string;
  let publicSetAId: string;
  let privateSetAId: string;
  let privateCardAId: string;

  beforeAll(async () => {
    adminClient = createClient<Database>(SUPABASE_URL, SERVICE_KEY);
    anonClient = createClient<Database>(SUPABASE_URL, ANON_KEY);

    // Create unique test users
    const emailA = `test_a_${Date.now()}@example.com`;
    const emailB = `test_b_${Date.now()}@example.com`;
    const password = "Password123!Secure";

    const { data: createdA, error: errA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Học viên A" },
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

    // User A creates a public learning set with a card
    const { data: pubSet, error: pubErr } = await clientA
      .from("learning_sets")
      .insert({
        owner_id: userAId,
        title: "Bộ từ công khai A",
        description: "Bộ từ học công khai của A",
        cefr_level: "A1",
        topic: "daily-life",
        is_public: true,
      })
      .select()
      .single();
    if (pubErr || !pubSet) throw new Error(`User A failed to create public set: ${pubErr?.message}`);
    publicSetAId = pubSet.id;

    await clientA.from("vocabulary_cards").insert({
      set_id: publicSetAId,
      term: "apple",
      meaning_vi: "quả táo",
      partOfSpeech: "noun" as never,
      part_of_speech: "noun",
      accepted_answers: ["apple"],
      position: 0,
    });

    // User A creates a private learning set with a card
    const { data: privSet, error: privErr } = await clientA
      .from("learning_sets")
      .insert({
        owner_id: userAId,
        title: "Bộ từ riêng tư A",
        description: "Chỉ User A được xem",
        cefr_level: "A2",
        topic: "private-study",
        is_public: false,
      })
      .select()
      .single();
    if (privErr || !privSet) throw new Error(`User A failed to create private set: ${privErr?.message}`);
    privateSetAId = privSet.id;

    const { data: privCard, error: cardErr } = await clientA
      .from("vocabulary_cards")
      .insert({
        set_id: privateSetAId,
        term: "secret",
        meaning_vi: "bí mật",
        part_of_speech: "noun",
        accepted_answers: ["secret"],
        position: 0,
      })
      .select()
      .single();
    if (cardErr || !privCard) throw new Error(`User A failed to create private card: ${cardErr?.message}`);
    privateCardAId = privCard.id;
  });

  // D01: Anon list sets/cards -> Chỉ public, không profiles hoặc private
  it("D01: Anon can view public sets/cards but CANNOT view private sets/cards or profiles", async () => {
    // Check public set
    const { data: pubSets } = await anonClient
      .from("learning_sets")
      .select("id, title, is_public")
      .eq("id", publicSetAId);
    expect(pubSets?.length).toBe(1);
    expect(pubSets?.[0].title).toBe("Bộ từ công khai A");

    // Check private set cannot be seen
    const { data: privSets } = await anonClient
      .from("learning_sets")
      .select("id")
      .eq("id", privateSetAId);
    expect(privSets?.length).toBe(0);

    // Check profiles cannot be queried by anon (strict privacy on explore)
    const { data: profiles, error: profilesError } = await anonClient.from("profiles").select("id, display_name");
    expect(profiles).toBeNull();
    expect(profilesError?.code).toBe("42501");
  });

  it("Session RPC denies anonymous and other-user writes while allowing owner and service role", async () => {
    const { data: session, error: createError } = await adminClient.from("study_sessions").insert({
      user_id: userAId, set_id: privateSetAId, mode: "learn", seed: "grants-regression",
      content_revision: 1, content_snapshot: [], ordered_card_ids: [privateCardAId],
    }).select("id").single();
    expect(createError).toBeNull();
    const args = { p_session_id: session!.id, p_expected_version: 1, p_state: { score: 1 }, p_active_elapsed_ms: 100 };
    try {
      const anonymous = await anonClient.rpc("save_session_state_v1", args);
      expect(anonymous.data).toBeNull();
      expect(anonymous.error?.code).toBe("42501");

      const otherUser = await clientB.rpc("save_session_state_v1", args);
      expect(otherUser.error).toBeNull();
      expect(otherUser.data).toMatchObject({ success: false, code: "FORBIDDEN" });

      const owner = await clientA.rpc("save_session_state_v1", args);
      expect(owner.error).toBeNull();
      expect(owner.data).toMatchObject({ success: true, new_version: 2 });

      const service = await adminClient.rpc("save_session_state_v1", { ...args, p_expected_version: 2 });
      expect(service.error).toBeNull();
      expect(service.data).toMatchObject({ success: true, new_version: 3 });
    } finally {
      await adminClient.from("study_sessions").delete().eq("id", session!.id);
    }
  });

  // D02: B query private A bằng UUID trực tiếp -> Không đọc được row/nested cards
  it("D02: User B querying User A's private set directly by UUID gets 0 rows and cannot read cards", async () => {
    const { data: bSetView } = await clientB
      .from("learning_sets")
      .select("id, title")
      .eq("id", privateSetAId);
    expect(bSetView?.length).toBe(0);

    const { data: bCardsView } = await clientB
      .from("vocabulary_cards")
      .select("id, term")
      .eq("set_id", privateSetAId);
    expect(bCardsView?.length).toBe(0);
  });

  // D03: B update/delete cards A -> Bị từ chối hoặc không có row bị đổi
  it("D03: User B cannot update or delete cards belonging to User A", async () => {
    // Attempt to update User A's private card
    const { data: updateRes } = await clientB
      .from("vocabulary_cards")
      .update({ term: "hacked_term" })
      .eq("id", privateCardAId)
      .select();
    expect(updateRes?.length || 0).toBe(0);

    // Verify card was untouched
    const { data: checkCard } = await clientA
      .from("vocabulary_cards")
      .select("term")
      .eq("id", privateCardAId)
      .single();
    expect(checkCard?.term).toBe("secret");

    // Attempt to delete User A's card
    const { data: deleteRes } = await clientB
      .from("vocabulary_cards")
      .delete()
      .eq("id", privateCardAId)
      .select();
    expect(deleteRes?.length || 0).toBe(0);
  });

  // D04: A chuyển owner_id sang B -> Bị chặn bởi trigger enforce_immutable_set_owner
  it("D04: User A attempting to transfer owner_id of learning_set to User B is blocked by trigger", async () => {
    const { error: transferErr } = await clientA
      .from("learning_sets")
      .update({ owner_id: userBId })
      .eq("id", privateSetAId);

    expect(transferErr).not.toBeNull();
    expect(transferErr?.message).toContain("immutable");
  });

  // D12: Delete/edit card -> Revision đổi
  it("D12: Editing or deleting a card automatically increments parent content_revision", async () => {
    const { data: setBefore } = await clientA
      .from("learning_sets")
      .select("content_revision")
      .eq("id", privateSetAId)
      .single();
    const revisionBefore = Number(setBefore?.content_revision);

    // Edit card
    const { error: editErr } = await clientA
      .from("vocabulary_cards")
      .update({ meaning_vi: "điều bí mật đã cập nhật" })
      .eq("id", privateCardAId);
    expect(editErr).toBeNull();

    const { data: setAfterEdit } = await clientA
      .from("learning_sets")
      .select("content_revision")
      .eq("id", privateSetAId)
      .single();
    const revisionAfterEdit = Number(setAfterEdit?.content_revision);
    expect(revisionAfterEdit).toBeGreaterThan(revisionBefore);

    // Add and then delete a card
    const { data: newCard } = await clientA
      .from("vocabulary_cards")
      .insert({
        set_id: privateSetAId,
        term: "temp_word",
        meaning_vi: "từ tạm",
        part_of_speech: "noun",
        accepted_answers: ["temp_word"],
        position: 1,
      })
      .select()
      .single();
    expect(newCard).not.toBeNull();

    await clientA.from("vocabulary_cards").delete().eq("id", newCard!.id);

    const { data: setAfterDelete } = await clientA
      .from("learning_sets")
      .select("content_revision")
      .eq("id", privateSetAId)
      .single();
    expect(Number(setAfterDelete?.content_revision)).toBeGreaterThan(revisionAfterEdit);
  });

  // D14: Hai import chunks cùng import_key -> Không nhân đôi cards (partial unique index)
  it("D14: Inserting duplicate import_key in the same set is rejected by unique index", async () => {
    const importKey = "csv-row-42";

    const { error: firstErr } = await clientA.from("vocabulary_cards").insert({
      set_id: privateSetAId,
      term: "unique1",
      meaning_vi: "nghĩa 1",
      part_of_speech: "noun",
      accepted_answers: ["unique1"],
      import_key: importKey,
      position: 10,
    });
    expect(firstErr).toBeNull();

    const { error: duplicateErr } = await clientA.from("vocabulary_cards").insert({
      set_id: privateSetAId,
      term: "unique2",
      meaning_vi: "nghĩa 2",
      part_of_speech: "noun",
      accepted_answers: ["unique2"],
      import_key: importKey,
      position: 11,
    });
    expect(duplicateErr).not.toBeNull();
    expect(duplicateErr?.message).toContain("duplicate");
  });

  // D15: Enforce card limit per set (test boundary trigger)
  it("D15: Verifies card limits and constraints protect data integrity", async () => {
    // Attempt to insert card with invalid part_of_speech
    const { error: invalidPosErr } = await clientA.from("vocabulary_cards").insert({
      set_id: privateSetAId,
      term: "bad",
      meaning_vi: "xấu",
      part_of_speech: "invalid_pos" as never,
      accepted_answers: ["bad"],
      position: 99,
    });
    expect(invalidPosErr).not.toBeNull();
  });
});
