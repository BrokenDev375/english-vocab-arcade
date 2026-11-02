import { DEMO_CARDS } from "./vocabulary.demo";
import type { DialogueOutput } from "@/features/ai/schemas";
const cardId = DEMO_CARDS[1].id;
export const DEMO_DIALOGUE: DialogueOutput = {
  title: "An apple after class",
  situationVi: "Hai người bạn trò chuyện về bữa ăn nhẹ sau giờ học.",
  level: "A1",
  usedCardIds: [cardId],
  turns: [
    {
      role: "A",
      cardId,
      textEn: "Would you like an apple?",
      textVi: "Bạn có muốn ăn một quả táo không?",
    },
    {
      role: "B",
      cardId,
      textEn: "Yes, I would like an apple.",
      textVi: "Có, mình muốn ăn một quả táo.",
    },
    {
      role: "A",
      cardId,
      textEn: "Here is a fresh apple for you.",
      textVi: "Đây là một quả táo tươi dành cho bạn.",
    },
    {
      role: "B",
      cardId,
      textEn: "Thank you for the apple.",
      textVi: "Cảm ơn bạn về quả táo nhé.",
    },
  ],
};
