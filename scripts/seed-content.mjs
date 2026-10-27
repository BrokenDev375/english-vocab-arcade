import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Environment configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

// Guard: NEVER seed production during build
if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) {
  console.log("Production environment detected. Skipping content seed to prevent unverified data.");
  process.exit(0);
}

const seedPath = path.join(root, "examples/vocabulary.seed.json");
if (!fs.existsSync(seedPath)) {
  console.error("Seed file not found:", seedPath);
  process.exit(1);
}

const seedRaw = fs.readFileSync(seedPath, "utf8");
const seedData = JSON.parse(seedRaw);

// Calculate content hash for manifest
const contentHash = crypto.createHash("sha256").update(seedRaw).digest("hex");

const manifest = {
  version: "1.0.0",
  generatedAt: new Date().toISOString(),
  contentHash,
  setCount: seedData.sets.length,
  totalCards: seedData.sets.reduce((sum, s) => sum + s.cards.length, 0),
};

const authHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function runSeed() {
  console.log("Starting Content Seed...");
  console.log("Manifest:", JSON.stringify(manifest, null, 2));

  // 1. Ensure a system seed owner exists in auth.users
  const seedEmail = "system_seed@vocab.internal";
  let seedUserId = null;

  const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: authHeaders,
  });

  if (!usersRes.ok) {
    throw new Error(`Failed to list admin users: ${usersRes.statusText}`);
  }

  const usersJson = await usersRes.json();
  const existingUser = usersJson.users?.find((u) => u.email === seedEmail);

  if (existingUser) {
    seedUserId = existingUser.id;
  } else {
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        email: seedEmail,
        password: "SeedPassword123!Internal",
        email_confirm: true,
        user_metadata: { display_name: "Hệ thống Học liệu Tiếng Anh" },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create system seed user: ${errText}`);
    }

    const createdJson = await createRes.json();
    seedUserId = createdJson.id || createdJson.user?.id;
  }

  console.log(`Using Seed User ID: ${seedUserId}`);

  // 2. Upsert sets and cards
  for (const set of seedData.sets) {
    console.log(`Processing set: ${set.title} (${set.id})`);

    const setRes = await fetch(`${SUPABASE_URL}/rest/v1/learning_sets`, {
      method: "POST",
      headers: {
        ...authHeaders,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        id: set.id,
        owner_id: seedUserId,
        title: set.title,
        description: set.description,
        language: "en",
        cefr_level: set.cefrLevel,
        topic: set.topic,
        is_public: true,
      }),
    });

    if (!setRes.ok) {
      const errText = await setRes.text();
      throw new Error(`Failed to upsert set ${set.id}: ${errText}`);
    }

    // Insert cards with deterministic import_key
    const cardsToInsert = set.cards.map((card, idx) => ({
      id: card.id,
      set_id: set.id,
      term: card.term.trim(),
      meaning_vi: card.meaningVi.trim(),
      part_of_speech: card.partOfSpeech,
      ipa: card.ipa || null,
      cefr_level: card.cefrLevel || null,
      example_en: card.exampleEn || null,
      example_vi: card.exampleVi || null,
      accepted_answers: card.acceptedAnswers,
      position: card.position !== undefined ? card.position : idx,
      import_key: `seed_${set.id}_${card.position}_${card.term}`.slice(0, 100),
    }));

    const cardsRes = await fetch(`${SUPABASE_URL}/rest/v1/vocabulary_cards`, {
      method: "POST",
      headers: {
        ...authHeaders,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(cardsToInsert),
    });

    if (!cardsRes.ok) {
      const errText = await cardsRes.text();
      throw new Error(`Failed to upsert cards for set ${set.id}: ${errText}`);
    }

    console.log(`Seeded ${cardsToInsert.length} cards for set ${set.id}.`);
  }

  console.log("Content Seed Completed Successfully.");
}

runSeed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
