import type { GrammarOutput, ReadingOutput, TranslationOutput } from "@/features/ai/schemas";

export const DEMO_GRAMMAR_EXERCISES: GrammarOutput = {
  exercises: [
    {
      cardId: "d0000000-0001-4000-8000-000000000011",
      sentenceEn: "She showed a tenacious spirit during the challenge.",
      sentenceVi: "Cô ấy đã thể hiện một tinh thần kiên trì trong suốt thử thách.",
      tokens: ["She", "showed", "a", "tenacious", "spirit", "during", "the", "challenge."],
      acceptedTokenOrders: [
        ["She", "showed", "a", "tenacious", "spirit", "during", "the", "challenge."],
      ],
      hintVi: "Bắt đầu bằng chủ ngữ 'She', tiếp theo là động từ quá khứ 'showed'.",
      explanationVi: "'Tenacious' là tính từ đứng trước danh từ 'spirit' mang nghĩa kiên cường, bền bỉ.",
    },
    {
      cardId: "d0000000-0001-4000-8000-000000000012",
      sentenceEn: "He is a diligent student who practices English daily.",
      sentenceVi: "Cậu ấy là một học sinh chăm chỉ, người luyện tập tiếng Anh mỗi ngày.",
      tokens: ["He", "is", "a", "diligent", "student", "who", "practices", "English", "daily."],
      acceptedTokenOrders: [
        ["He", "is", "a", "diligent", "student", "who", "practices", "English", "daily."],
      ],
      hintVi: "Mệnh đề quan hệ bắt đầu với 'who'.",
      explanationVi: "'Diligent' bổ nghĩa cho 'student' để diễn tả sự cần cù, siêng năng.",
    },
    {
      cardId: "d0000000-0001-4000-8000-000000000013",
      sentenceEn: "We need resilience to overcome difficult moments in life.",
      sentenceVi: "Chúng ta cần sự kiên cường để vượt qua những khoảnh khắc khó khăn trong cuộc sống.",
      tokens: ["We", "need", "resilience", "to", "overcome", "difficult", "moments", "in", "life."],
      acceptedTokenOrders: [
        ["We", "need", "resilience", "to", "overcome", "difficult", "moments", "in", "life."],
      ],
      hintVi: "Động từ 'need' đi trực tiếp với danh từ không đếm được 'resilience'.",
      explanationVi: "'Resilience' là danh từ chỉ khả năng phục hồi, kiên cường.",
    },
  ],
};

export const DEMO_READING_EXERCISE: ReadingOutput = {
  title: "The Power of Persistence",
  level: "A2",
  passageEn:
    "Learning a foreign language is an exciting journey that requires dedication and patience. When students practice vocabulary every day, their memory becomes stronger. Mistakes are a natural part of the learning process. A diligent learner does not give up when a word is hard to pronounce. Instead, they show resilience by practicing again and listening carefully. Over time, these small daily efforts lead to fluent conversations and confidence.",
  translationVi:
    "Học một ngoại ngữ là một hành trình thú vị đòi hỏi sự cống hiến và kiên nhẫn. Khi học sinh luyện tập từ vựng mỗi ngày, trí nhớ của họ trở nên mạnh mẽ hơn. Sai sót là một phần tự nhiên của quá trình học. Một người học chăm chỉ không bỏ cuộc khi một từ khó phát âm. Thay vào đó, họ thể hiện sự kiên cường bằng cách luyện tập lại và lắng nghe cẩn thận. Theo thời gian, những nỗ lực nhỏ hàng ngày này dẫn đến những cuộc hội thoại lưu loát và sự tự tin.",
  usedCardIds: [
    "d0000000-0001-4000-8000-000000000011",
    "d0000000-0001-4000-8000-000000000012",
  ],
  questions: [
    {
      id: "q1",
      questionEn: "What does learning a foreign language require according to the text?",
      options: [
        "Dedication and patience",
        "A large amount of money",
        "Traveling to another country",
        "Never making any mistakes",
      ],
      correctIndex: 0,
      explanationVi: "Đoạn văn mở đầu nêu rõ: 'requires dedication and patience'.",
    },
    {
      id: "q2",
      questionEn: "How does daily vocabulary practice help learners?",
      options: [
        "It makes memory stronger",
        "It makes them feel tired",
        "It stops them from speaking",
        "It takes too much time",
      ],
      correctIndex: 0,
      explanationVi: "Đoạn văn viết: 'their memory becomes stronger'.",
    },
    {
      id: "q3",
      questionEn: "What does a diligent learner do when a word is difficult?",
      options: [
        "Shows resilience and practices again",
        "Gives up immediately",
        "Changes to another language",
        "Ignores pronunciation entirely",
      ],
      correctIndex: 0,
      explanationVi: "Đoạn văn viết: 'they show resilience by practicing again'.",
    },
    {
      id: "q4",
      questionEn: "What is the main message of the reading passage?",
      options: [
        "Small daily efforts lead to confidence and fluency",
        "Language learning is impossible without living abroad",
        "Grammar tests are the only way to measure skill",
        "Pronunciation is not important in daily life",
      ],
      correctIndex: 0,
      explanationVi: "Câu kết khẳng định: 'small daily efforts lead to fluent conversations and confidence'.",
    },
  ],
};

export const DEMO_TRANSLATION_EXERCISES: TranslationOutput = {
  exercises: [
    {
      cardId: "d0000000-0001-4000-8000-000000000011",
      promptVi: "Họ là những người làm việc kiên trì và tận tụy.",
      referenceEn: "They are tenacious and dedicated workers.",
      acceptedAnswers: [
        "They are tenacious and dedicated workers.",
        "They are tenacious and dedicated workers",
        "They are persistent and dedicated workers.",
      ],
      requiredWordForms: ["tenacious"],
      hints: [
        { word: "tenacious", meaningVi: "kiên trì, bền bỉ", ipa: "/təˈneɪ.ʃəs/" },
        { word: "dedicated", meaningVi: "tận tụy, cống hiến", ipa: "/ˈded.ɪ.keɪ.tɪd/" },
      ],
      explanationVi: "Cụm danh từ: 'tenacious and dedicated workers'.",
    },
    {
      cardId: "d0000000-0001-4000-8000-000000000012",
      promptVi: "Cô ấy học tiếng Anh một cách chăm chỉ mỗi tối.",
      referenceEn: "She studies English diligently every evening.",
      acceptedAnswers: [
        "She studies English diligently every evening.",
        "She studies English diligently every evening",
        "She diligently studies English every night.",
      ],
      requiredWordForms: ["diligently", "diligent"],
      hints: [
        { word: "diligently", meaningVi: "một cách chăm chỉ", ipa: "/ˈdɪl.ɪ.dʒənt.li/" },
      ],
      explanationVi: "Trạng từ 'diligently' bổ nghĩa cho động từ 'studies'.",
    },
  ],
};
