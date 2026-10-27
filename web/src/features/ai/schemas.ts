import { z } from "zod";

// 1. Context — 1 example sentence per card (max 10 cards)
export const ContextItemSchema = z.object({
  cardId: z.string().uuid(),
  sentenceEn: z.string().min(5).max(300),
  sentenceVi: z.string().min(5).max(300),
  targetSurface: z.string().min(1).max(80),
  explanationVi: z.string().min(5).max(400),
});

export const ContextOutputSchema = z.object({
  items: z.array(ContextItemSchema).min(1).max(10),
});
export type ContextOutput = z.infer<typeof ContextOutputSchema>;

// 2. Grammar — sentence unscramble (max 6 cards)
export const GrammarExerciseSchema = z.object({
  cardId: z.string().uuid(),
  sentenceEn: z.string().min(5).max(250),
  sentenceVi: z.string().min(5).max(250),
  tokens: z.array(z.string().min(1).max(50)).min(3).max(20),
  acceptedTokenOrders: z.array(z.array(z.string().min(1).max(50))).min(1),
  hintVi: z.string().min(2).max(250),
  explanationVi: z.string().min(5).max(400),
});

export const GrammarOutputSchema = z.object({
  exercises: z.array(GrammarExerciseSchema).min(1).max(6),
});
export type GrammarOutput = z.infer<typeof GrammarOutputSchema>;

// 3. Reading — passage with 4 closed questions
export const ReadingQuestionSchema = z.object({
  id: z.string().min(1),
  questionEn: z.string().min(5).max(250),
  options: z.tuple([
    z.string().min(1).max(120),
    z.string().min(1).max(120),
    z.string().min(1).max(120),
    z.string().min(1).max(120),
  ]),
  correctIndex: z.number().int().min(0).max(3),
  explanationVi: z.string().min(5).max(300),
});

export const ReadingOutputSchema = z.object({
  title: z.string().min(2).max(120),
  level: z.enum(["A1", "A2", "B1"]),
  passageEn: z.string().min(40).max(1500),
  translationVi: z.string().min(40).max(1500),
  usedCardIds: z.array(z.string().uuid()).min(1),
  questions: z.array(ReadingQuestionSchema).length(4),
});
export type ReadingOutput = z.infer<typeof ReadingOutputSchema>;

// 4. Translation — Vietnamese to English (max 10 cards)
export const TranslationExerciseSchema = z.object({
  cardId: z.string().uuid(),
  promptVi: z.string().min(5).max(250),
  referenceEn: z.string().min(5).max(250),
  acceptedAnswers: z.array(z.string().min(1).max(250)).min(1),
  requiredWordForms: z.array(z.string().min(1).max(80)).min(1),
  hints: z.array(
    z.object({
      word: z.string().min(1).max(80),
      meaningVi: z.string().min(1).max(150),
      ipa: z.string().max(80).optional(),
    })
  ).default([]),
  explanationVi: z.string().min(5).max(400),
});

export const TranslationOutputSchema = z.object({
  exercises: z.array(TranslationExerciseSchema).min(1).max(10),
});
export type TranslationOutput = z.infer<typeof TranslationOutputSchema>;

export type AiMode = "context" | "grammar" | "reading" | "translation";
export type AiBatchOutput =
  | { mode: "context"; data: ContextOutput }
  | { mode: "grammar"; data: GrammarOutput }
  | { mode: "reading"; data: ReadingOutput }
  | { mode: "translation"; data: TranslationOutput };
