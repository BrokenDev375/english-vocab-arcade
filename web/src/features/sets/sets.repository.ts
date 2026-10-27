import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.generated";

export interface ListSetsOptions {
  scope?: "explore" | "user";
  search?: string;
  level?: string;
  topic?: string;
  page?: number;
  pageSize?: number;
}

export interface SetWithCardCount {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  language: string;
  cefr_level: string;
  topic: string;
  is_public: boolean;
  content_revision: number;
  created_at: string;
  updated_at: string;
  card_count: number;
}

/**
 * List learning sets.
 * CRITICAL RULE: On 'explore' scope, never join profiles or expose author name, username, or avatar.
 */
export async function listLearningSets(
  supabase: SupabaseClient<Database>,
  options: ListSetsOptions = {}
): Promise<{ sets: SetWithCardCount[]; total: number }> {
  const {
    scope = "explore",
    search = "",
    level = "ALL",
    topic = "",
    page = 1,
    pageSize = 12,
  } = options;

  const validPage = Math.max(1, page);
  const validPageSize = Math.min(50, Math.max(1, pageSize));
  const from = (validPage - 1) * validPageSize;
  const to = from + validPageSize - 1;

  let query = supabase
    .from("learning_sets")
    .select(
      "id, owner_id, title, description, language, cefr_level, topic, is_public, content_revision, created_at, updated_at",
      { count: "exact" }
    );

  if (scope === "explore") {
    query = query.eq("is_public", true);
  }

  if (search.trim()) {
    query = query.or(`title.ilike.%${search.trim()}%,topic.ilike.%${search.trim()}%`);
  }

  if (level && level !== "ALL") {
    query = query.eq("cefr_level", level);
  }

  if (topic.trim()) {
    query = query.eq("topic", topic.trim());
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) {
    throw new Error(`Failed to list learning sets: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return { sets: [], total: count || 0 };
  }

  // Fetch card counts for these sets
  const setIds = data.map((s) => s.id);
  const { data: cardsCountData } = await supabase
    .from("vocabulary_cards")
    .select("set_id")
    .in("set_id", setIds);

  const countMap = new Map<string, number>();
  if (cardsCountData) {
    for (const card of cardsCountData) {
      countMap.set(card.set_id, (countMap.get(card.set_id) || 0) + 1);
    }
  }

  const sets: SetWithCardCount[] = data.map((item) => ({
    ...item,
    card_count: countMap.get(item.id) || 0,
  }));

  return { sets, total: count || 0 };
}

/**
 * Get learning set by ID with card count
 */
export async function getLearningSetById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<SetWithCardCount | null> {
  const { data, error } = await supabase
    .from("learning_sets")
    .select(
      "id, owner_id, title, description, language, cefr_level, topic, is_public, content_revision, created_at, updated_at"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  const { count } = await supabase
    .from("vocabulary_cards")
    .select("id", { count: "exact", head: true })
    .eq("set_id", id);

  return {
    ...data,
    card_count: count || 0,
  };
}

/**
 * Create a new learning set
 */
export async function createLearningSet(
  supabase: SupabaseClient<Database>,
  params: {
    ownerId: string;
    title: string;
    description?: string;
    cefrLevel: string;
    topic: string;
    isPublic?: boolean;
  }
) {
  const { data, error } = await supabase
    .from("learning_sets")
    .insert({
      owner_id: params.ownerId,
      title: params.title.trim(),
      description: (params.description || "").trim(),
      language: "en",
      cefr_level: params.cefrLevel,
      topic: params.topic.trim(),
      is_public: Boolean(params.isPublic),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create learning set: ${error.message}`);
  }

  return data;
}

/**
 * Update learning set with revision guard
 */
export async function updateLearningSet(
  supabase: SupabaseClient<Database>,
  id: string,
  updates: {
    title?: string;
    description?: string;
    cefrLevel?: string;
    topic?: string;
    isPublic?: boolean;
    expectedRevision?: number;
  }
) {
  let query = supabase.from("learning_sets").update({
    ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
    ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
    ...(updates.cefrLevel !== undefined ? { cefr_level: updates.cefrLevel } : {}),
    ...(updates.topic !== undefined ? { topic: updates.topic.trim() } : {}),
    ...(updates.isPublic !== undefined ? { is_public: updates.isPublic } : {}),
    updated_at: new Date().toISOString(),
  });

  query = query.eq("id", id);

  if (updates.expectedRevision !== undefined) {
    query = query.eq("content_revision", updates.expectedRevision);
  }

  const { data, error } = await query.select().single();

  if (error) {
    throw new Error(`Failed to update learning set: ${error.message}`);
  }

  return data;
}

/**
 * Delete learning set
 */
export async function deleteLearningSet(
  supabase: SupabaseClient<Database>,
  id: string
) {
  const { error } = await supabase.from("learning_sets").delete().eq("id", id);
  if (error) {
    throw new Error(`Failed to delete learning set: ${error.message}`);
  }
  return true;
}

export interface ListCardsOptions {
  cursorPosition?: number;
  cursorId?: string;
  limit?: number;
}

/**
 * List vocabulary cards for a set using cursor pagination (position, id)
 * Supports up to 5,000 cards per set
 */
export async function listSetCards(
  supabase: SupabaseClient<Database>,
  setId: string,
  options: ListCardsOptions = {}
) {
  const limit = Math.min(500, Math.max(1, options.limit || 200));

  let query = supabase
    .from("vocabulary_cards")
    .select("*")
    .eq("set_id", setId)
    .order("position", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit + 1);

  if (options.cursorPosition !== undefined && options.cursorId !== undefined) {
    // Seek cursor: position > cursorPosition OR (position = cursorPosition AND id > cursorId)
    query = query.or(
      `position.gt.${options.cursorPosition},and(position.eq.${options.cursorPosition},id.gt.${options.cursorId})`
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list cards: ${error.message}`);
  }

  const cards = data || [];
  let nextCursor: { position: number; id: string } | null = null;

  if (cards.length > limit) {
    cards.pop();
    const lastItem = cards[cards.length - 1];
    if (lastItem) {
      nextCursor = { position: lastItem.position, id: lastItem.id };
    }
  }

  return {
    cards,
    nextCursor,
  };
}

export interface NewCardInput {
  id?: string;
  term: string;
  meaningVi: string;
  partOfSpeech: string;
  ipa?: string | null;
  cefrLevel?: string | null;
  exampleEn?: string | null;
  exampleVi?: string | null;
  acceptedAnswers?: string[];
  position?: number;
  importKey?: string | null;
}

/**
 * Batch insert cards into a set (max 100 per request)
 */
export async function insertSetCards(
  supabase: SupabaseClient<Database>,
  setId: string,
  newCards: NewCardInput[]
) {
  if (newCards.length === 0) return [];
  if (newCards.length > 100) {
    throw new Error("Cannot insert more than 100 cards per request");
  }

  const rows = newCards.map((c, index) => ({
    ...(c.id ? { id: c.id } : {}),
    set_id: setId,
    term: c.term.trim(),
    meaning_vi: c.meaningVi.trim(),
    part_of_speech: c.partOfSpeech,
    ipa: c.ipa || null,
    cefr_level: c.cefrLevel || null,
    example_en: c.exampleEn ? c.exampleEn.trim() : null,
    example_vi: c.exampleVi ? c.exampleVi.trim() : null,
    accepted_answers: (c.acceptedAnswers && c.acceptedAnswers.length > 0)
      ? c.acceptedAnswers
      : [c.term.trim()],
    position: c.position !== undefined ? c.position : index,
    import_key: c.importKey || null,
  }));

  const { data, error } = await supabase
    .from("vocabulary_cards")
    .insert(rows)
    .select();

  if (error) {
    throw new Error(`Failed to insert cards: ${error.message}`);
  }

  return data;
}

/**
 * Update single card
 */
export async function updateSetCard(
  supabase: SupabaseClient<Database>,
  cardId: string,
  updates: Partial<NewCardInput>
) {
  const updatePayload: Database["public"]["Tables"]["vocabulary_cards"]["Update"] = {};

  if (updates.term !== undefined) updatePayload.term = updates.term.trim();
  if (updates.meaningVi !== undefined) updatePayload.meaning_vi = updates.meaningVi.trim();
  if (updates.partOfSpeech !== undefined) updatePayload.part_of_speech = updates.partOfSpeech;
  if (updates.ipa !== undefined) updatePayload.ipa = updates.ipa;
  if (updates.cefrLevel !== undefined) updatePayload.cefr_level = updates.cefrLevel;
  if (updates.exampleEn !== undefined) updatePayload.example_en = updates.exampleEn;
  if (updates.exampleVi !== undefined) updatePayload.example_vi = updates.exampleVi;
  if (updates.acceptedAnswers !== undefined) updatePayload.accepted_answers = updates.acceptedAnswers;
  if (updates.position !== undefined) updatePayload.position = updates.position;

  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("vocabulary_cards")
    .update(updatePayload)
    .eq("id", cardId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update card: ${error.message}`);
  }

  return data;
}

/**
 * Delete a single card
 */
export async function deleteSetCard(
  supabase: SupabaseClient<Database>,
  cardId: string
) {
  const { error } = await supabase
    .from("vocabulary_cards")
    .delete()
    .eq("id", cardId);

  if (error) {
    throw new Error(`Failed to delete card: ${error.message}`);
  }

  return true;
}
