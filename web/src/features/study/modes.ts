export const STUDY_MODE_LABELS: Record<string, string> = {
  flashcard: "Thẻ ghi nhớ",
  learn: "Học",
  test: "Kiểm tra",
  match: "Ghép thẻ",
  speak: "Speaking",
  dialogue: "Hội thoại",
  grammar: "Ngữ pháp",
  reading: "Đọc hiểu",
  translate: "Dịch câu",
  dictation: "Nghe chép",
  arcade_typing: "Word Blaster",
  arcade_recall: "Word Blaster",
};

export function studyModeHref(setId: string, mode: string) {
  if (mode === "flashcard") return `/sets/${setId}#flashcard-arena`;
  if (mode === "arcade_typing" || mode === "arcade_recall")
    return `/sets/${setId}/arcade?mode=${mode === "arcade_recall" ? "recall" : "typing"}`;
  return `/sets/${setId}/${Object.hasOwn(STUDY_MODE_LABELS, mode) ? mode : "learn"}`;
}
