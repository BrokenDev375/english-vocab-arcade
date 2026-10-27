import { z } from "zod";

export const CefrLevelSchema = z.enum(["A1", "A2", "B1", "mixed"]);
export type CefrLevel = z.infer<typeof CefrLevelSchema>;

export const PartOfSpeechSchema = z.enum([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "phrase",
  "other",
]);
export type PartOfSpeech = z.infer<typeof PartOfSpeechSchema>;

export const VocabularyCardSchema = z.object({
  id: z.string().uuid(),
  term: z.string().min(1).max(80),
  meaningVi: z.string().min(1).max(300),
  partOfSpeech: PartOfSpeechSchema,
  ipa: z.string().max(120).nullable().optional(),
  cefrLevel: CefrLevelSchema.optional(),
  exampleEn: z.string().max(500).optional(),
  exampleVi: z.string().max(500).optional(),
  acceptedAnswers: z.array(z.string().min(1).max(80)),
  position: z.number().int().nonnegative(),
  reviewStatus: z.enum(["draft", "reviewed", "verified"]).default("draft"),
});
export type VocabularyCard = z.infer<typeof VocabularyCardSchema>;

export const LearningSetSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  language: z.literal("en").default("en"),
  cefrLevel: CefrLevelSchema.default("A1"),
  topic: z.string().min(1).max(60),
  isPublic: z.boolean().default(false),
  cardCount: z.number().int().nonnegative().default(0),
  cards: z.array(VocabularyCardSchema).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type LearningSet = z.infer<typeof LearningSetSchema>;
