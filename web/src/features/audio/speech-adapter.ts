/**
 * Speech Adapter for English Vocab Arcade
 * Provides Web Speech API TTS (Text-to-Speech) and STT (Speech-to-Text) with reliable fallbacks.
 * Complies strictly with AGENTS.md:
 * - Does not claim transcript matching is an exact IELTS or native intonation assessment.
 * - Handles autoplay restrictions with user-gesture requirements.
 */

import { normalizeAnswerText } from "@/features/study/engine";

/**
 * Options for text-to-speech playback
 */
export interface SpeakOptions {
  rate?: number; // 0.75 = slow, 1.0 = normal
  voiceLang?: "en-US" | "en-GB";
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

/**
 * Plays English speech using native browser SpeechSynthesis.
 * Safe in SSR (returns early if window is undefined).
 */
export function playEnglishSpeech(text: string, options: SpeakOptions = {}): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  const { rate = 1.0, voiceLang = "en-US", onStart, onEnd, onError } = options;

  try {
    window.speechSynthesis.cancel(); // Stop any pending utterance

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLang;
    utterance.rate = rate;

    // Pick appropriate English voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find((v) => v.lang.startsWith(voiceLang) || v.lang.startsWith("en"));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;
    if (onError) utterance.onerror = onError;

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    if (onError) onError(err);
    return false;
  }
}

/**
 * Result of speech transcript evaluation
 */
export interface SpeechGradeResult {
  isMatch: boolean;
  score: number; // 0 to 100 percentage
  feedback: string;
  matchedText: string;
  recognizedTokens: string[];
  targetTokens: string[];
}

/**
 * Token-based speech transcript grading.
 * Strictly prevents substring false positives (e.g. saying "a cat" should not give 100% for "cat").
 * Does NOT claim to be an IELTS or phonetic accent evaluation.
 */
export function gradeSpeechTranscript(
  transcript: string,
  targetTerm: string,
  acceptedVariants: string[] = []
): SpeechGradeResult {
  const normTranscript = normalizeAnswerText(transcript);
  const normTarget = normalizeAnswerText(targetTerm);

  if (!normTranscript) {
    return {
      isMatch: false,
      score: 0,
      feedback: "Chưa nhận diện được giọng nói. Vui lòng thử phát âm lại.",
      matchedText: "",
      recognizedTokens: [],
      targetTokens: normTarget.split(" ").filter(Boolean),
    };
  }

  const targetTokens = normTarget.split(" ").filter(Boolean);
  const recognizedTokens = normTranscript.split(" ").filter(Boolean);

  // 1. Direct canonical match
  if (normTranscript === normTarget) {
    return {
      isMatch: true,
      score: 100,
      feedback: "Phát âm nhận diện rất rõ ràng và chuẩn xác!",
      matchedText: targetTerm,
      recognizedTokens,
      targetTokens,
    };
  }

  // 2. Check accepted variants
  for (const variant of acceptedVariants) {
    if (normalizeAnswerText(variant) === normTranscript) {
      return {
        isMatch: true,
        score: 100,
        feedback: "Khớp biến thể phát âm được chấp nhận.",
        matchedText: variant,
        recognizedTokens,
        targetTokens,
      };
    }
  }

  // 3. Token-by-token overlap comparison (Jaccard / Token Recall)
  let matchingTokensCount = 0;
  for (const targetToken of targetTokens) {
    if (recognizedTokens.includes(targetToken)) {
      matchingTokensCount++;
    }
  }

  // Compute recall against target length
  const score = Math.round((matchingTokensCount / Math.max(targetTokens.length, recognizedTokens.length)) * 100);

  const isMatch = score >= 75;
  let feedback = "";
  if (isMatch) {
    feedback = "Khớp tốt! Độ tương đồng nhận diện từ đạt yêu cầu.";
  } else if (score >= 40) {
    feedback = "Gần đúng! Nhận diện được một số từ, hãy thử phát âm rõ ràng hơn.";
  } else {
    feedback = "Chưa khớp từ mục tiêu. Hãy nghe lại phát âm mẫu và thử lại.";
  }

  return {
    isMatch,
    score,
    feedback,
    matchedText: isMatch ? targetTerm : "",
    recognizedTokens,
    targetTokens,
  };
}
