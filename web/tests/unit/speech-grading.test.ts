import { describe, it, expect } from "vitest";
import { gradeSpeechTranscript } from "@/features/audio/speech-adapter";

describe("T17 - Speech Transcript Token Grading (P10)", () => {
  it("gives 100% on exact canonical match (ignoring case and extra spaces)", () => {
    const res = gradeSpeechTranscript("  TENACIOUS  ", "tenacious");
    expect(res.isMatch).toBe(true);
    expect(res.score).toBe(100);
    expect(res.feedback).toContain("chuẩn xác");
  });

  it("matches accepted pronunciation / term variants", () => {
    const res = gradeSpeechTranscript("gonna", "going to", ["gonna", "going to"]);
    expect(res.isMatch).toBe(true);
    expect(res.score).toBe(100);
  });

  it("does not grant 100% just because target is a tiny substring of an unrelated sentence", () => {
    // If target is "cat", and user says "well I think that is a very cute cat over there"
    const res = gradeSpeechTranscript(
      "well I think that is a very cute cat over there",
      "cat"
    );
    // Overlap is 1 out of 11 tokens -> score is only 9%!
    expect(res.score).toBeLessThan(50);
    expect(res.isMatch).toBe(false);
  });

  it("handles multi-word phrases by token overlap", () => {
    // Target: "give up"
    // User says: "give up" -> 100%
    const resExact = gradeSpeechTranscript("give up", "give up");
    expect(resExact.isMatch).toBe(true);
    expect(resExact.score).toBe(100);

    // User says: "give" -> 1 out of 2 tokens -> 50%
    const resPartial = gradeSpeechTranscript("give", "give up");
    expect(resPartial.score).toBe(50);
    expect(resPartial.isMatch).toBe(false);
  });

  it("handles empty or noise transcripts safely", () => {
    const resEmpty = gradeSpeechTranscript("", "resilience");
    expect(resEmpty.isMatch).toBe(false);
    expect(resEmpty.score).toBe(0);
    expect(resEmpty.feedback).toContain("Chưa nhận diện");
  });

  it("strictly avoids making claims about IELTS speaking or native accent grading", () => {
    const res = gradeSpeechTranscript("tenacious", "tenacious");
    const feedbackLower = res.feedback.toLowerCase();
    expect(feedbackLower).not.toContain("ielts");
    expect(feedbackLower).not.toContain("bản xứ");
    expect(feedbackLower).not.toContain("accent");
  });
});
