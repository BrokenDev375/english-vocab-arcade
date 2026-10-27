import { z } from "zod";

export const StudyModeSchema = z.enum(["flashcard", "learn", "match", "arcade", "test"]);

export const CreateSessionRequestSchema = z.object({
  setId: z.string().uuid("setId phải là UUID hợp lệ"),
  mode: StudyModeSchema,
  initialSettings: z.record(z.string(), z.unknown()).optional(),
});

export const RecordAttemptRequestSchema = z.object({
  sessionId: z.string().uuid("sessionId phải là UUID hợp lệ"),
  setId: z.string().uuid("setId phải là UUID hợp lệ"),
  cardId: z.string().uuid("cardId phải là UUID hợp lệ"),
  mode: StudyModeSchema,
  questionType: z.enum(["flashcard_self_rate", "multiple_choice", "type_in", "scramble", "match", "arcade_typing", "arcade_recall"]),
  userAnswer: z.string().max(500).optional().default(""),
  isCorrect: z.boolean(),
  durationMs: z.number().int().min(0, "durationMs không được là số âm").max(3600000, "durationMs không được vượt quá 1 giờ"),
  clientEventId: z.string().min(1).max(100),
  answeredAt: z.string().datetime().optional(),
});

export const SaveSessionStateRequestSchema = z.object({
  sessionId: z.string().uuid("sessionId phải là UUID hợp lệ"),
  expectedVersion: z.number().int().min(1, "expectedVersion phải lớn hơn hoặc bằng 1"),
  stateSnapshot: z.record(z.string(), z.unknown()),
  status: z.enum(["active", "paused", "completed", "abandoned"]).optional(),
});

export type RecordAttemptRequest = z.infer<typeof RecordAttemptRequestSchema>;
export type SaveSessionStateRequest = z.infer<typeof SaveSessionStateRequestSchema>;
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
