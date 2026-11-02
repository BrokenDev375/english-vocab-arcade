"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookMarked,
  BookOpenText,
  Brain,
  Edit3,
  FileCheck2,
  Gamepad2,
  Globe,
  Headphones,
  Languages,
  Lock,
  MessageSquare,
  Mic,
  Play,
  Sparkles,
  Trash2,
  Volume2,
  Zap,
} from "lucide-react";
import { FlashcardViewer } from "@/components/study/FlashcardViewer";
import { Button } from "@/components/ui/Button";
import { playEnglishSpeech } from "@/features/audio/speech-adapter";
import { STUDY_MODE_LABELS, studyModeHref } from "@/features/study/modes";
import type { StudyCard } from "@/features/study/question-engine";

const modes = [
  {
    mode: "speak",
    title: "Speaking",
    text: "Luyện nói tiếng Anh",
    icon: Mic,
    color: "bg-rose-500/10 text-rose-600",
  },
  {
    mode: "dialogue",
    title: "Hội thoại",
    text: "Giao tiếp theo vai A/B",
    icon: MessageSquare,
    color: "bg-purple-500/10 text-purple-600",
  },
  {
    mode: "grammar",
    title: "Ngữ pháp",
    text: "Sắp xếp câu",
    icon: BookMarked,
    color: "bg-indigo-500/10 text-indigo-600",
  },
  {
    mode: "reading",
    title: "Đọc hiểu",
    text: "Bài đọc ngữ cảnh",
    icon: BookOpenText,
    color: "bg-indigo-500/10 text-indigo-600",
  },
  {
    mode: "learn",
    title: "Học",
    text: "Luyện từ và ôn lỗi",
    icon: Brain,
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    mode: "test",
    title: "Kiểm tra",
    text: "Tự đánh giá vốn từ",
    icon: FileCheck2,
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    mode: "dictation",
    title: "Nghe chép",
    text: "Luyện nghe và chính tả",
    icon: Headphones,
    color: "bg-cyan-500/10 text-cyan-600",
  },
  {
    mode: "match",
    title: "Ghép thẻ",
    text: "Ghép cặp theo chặng",
    icon: Gamepad2,
    color: "bg-orange-500/10 text-orange-600",
  },
  {
    mode: "translate",
    title: "Dịch câu",
    text: "Việt → Anh",
    icon: Languages,
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    mode: "arcade_typing",
    title: "Word Blaster",
    text: "Gõ từ bắn mục tiêu",
    icon: Zap,
    color: "bg-yellow-500/10 text-yellow-600",
  },
];

export interface SetStudyHubProps {
  set: {
    id: string;
    title: string;
    description: string;
    cefrLevel: string;
    topic: string;
    isPublic: boolean;
    isOwner: boolean;
    isDemo: boolean;
  };
  cards: StudyCard[];
  resume?: { mode: string; index: number } | null;
}

export function SetStudyHub({ set, cards, resume }: SetStudyHubProps) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remove = async () => {
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/sets/${set.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Chưa xóa được học phần. Hãy thử lại.");
      router.push("/dashboard");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Chưa xóa được học phần.",
      );
      setDeleting(false);
    }
  };
  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <Link
            href="/explore"
            className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-indigo-600"
          >
            <ArrowLeft className="size-4" />
            Tất cả học phần
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="break-words text-2xl font-black tracking-tight sm:text-3xl">
              {set.title}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-800">
              {set.isPublic ? (
                <Globe className="size-3" />
              ) : (
                <Lock className="size-3" />
              )}
              {set.isPublic ? "Công khai" : "Riêng tư"}
            </span>
          </div>
          {set.description && (
            <p className="mt-2 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-zinc-500">
              {set.description}
            </p>
          )}
          <p className="mt-3 text-xs font-semibold text-zinc-500">
            {cards.length} thuật ngữ <span className="mx-2">·</span> CEFR{" "}
            {set.cefrLevel.toUpperCase()} <span className="mx-2">·</span>{" "}
            {set.topic}
          </p>
        </div>
        {set.isOwner && (
          <div className="flex shrink-0 gap-2 sm:pt-8">
            <Link
              href={`/sets/${set.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <Edit3 className="size-4" />
              Sửa
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete((value) => !value)}
              aria-label="Xóa học phần"
            >
              <Trash2 className="size-4 text-rose-500" />
            </Button>
          </div>
        )}
      </div>
      {set.isDemo && (
        <p
          role="note"
          className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-200"
        >
          Học phần mẫu để trải nghiệm. Tiến độ của bộ mẫu được lưu trên trình
          duyệt, tách biệt với học phần trong tài khoản.
        </p>
      )}
      {confirmDelete && (
        <div
          role="alert"
          className="space-y-3 rounded-xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950"
        >
          <p className="text-sm">
            Xóa học phần sẽ xóa toàn bộ thẻ của học phần này. Bạn có chắc muốn
            tiếp tục?
          </p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              disabled={deleting}
              onClick={() => {
                void remove();
              }}
            >
              Xóa vĩnh viễn
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={deleting}
              onClick={() => setConfirmDelete(false)}
            >
              Hủy
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
      {resume && (
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/5 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold">Tiếp tục tiến độ học trước đó</p>
              <p className="mt-1 text-xs text-zinc-500">
                {STUDY_MODE_LABELS[resume.mode] || "Học"}
                {resume.mode === "flashcard"
                  ? ` · Thẻ ${Math.min(resume.index + 1, cards.length)} / ${cards.length}`
                  : " · Quay lại phiên đang học"}
              </p>
            </div>
          </div>
          <Link
            href={studyModeHref(set.id, resume.mode)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
          >
            <Play className="size-4" />
            Tiếp tục ngay
          </Link>
        </div>
      )}
      <nav
        aria-label="Các chế độ học"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3"
      >
        {modes.map(({ mode, title, text, icon: Icon, color }) => (
          <Link
            key={mode}
            href={studyModeHref(set.id, mode)}
            className={`group flex min-w-0 items-center gap-3 rounded-2xl border p-3.5 shadow-xs transition hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-sm ${mode === "arcade_typing" ? "border-amber-500/30 bg-amber-500/5 sm:col-span-3" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}
          >
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${color}`}
            >
              <Icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold">{title}</span>
              <span className="mt-0.5 block text-xs text-zinc-500">{text}</span>
            </span>
          </Link>
        ))}
      </nav>
      <section
        id="flashcard-arena"
        aria-label="Thẻ ghi nhớ"
        className="scroll-mt-24 space-y-4"
      >
        <h2 className="text-lg font-bold">Thẻ ghi nhớ</h2>
        {cards.length ? (
          <FlashcardViewer cards={cards} setId={set.id} />
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center">
            <p className="text-zinc-500">Học phần chưa có thẻ.</p>
            {set.isOwner && (
              <Link
                href={`/sets/${set.id}/edit`}
                className="mt-3 inline-block font-semibold text-indigo-600"
              >
                Thêm từ đầu tiên
              </Link>
            )}
          </div>
        )}
      </section>
      <section className="space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-xl font-extrabold">
          Danh sách thuật ngữ ({cards.length})
        </h2>
        <div className="space-y-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs sm:grid-cols-[1fr_1px_1.4fr_auto] sm:items-center dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="min-w-0">
                <p className="break-words text-lg font-bold">{card.term}</p>
                {card.ipa && (
                  <p className="mt-1 font-mono text-xs text-zinc-400">
                    {card.ipa}
                  </p>
                )}
                {card.partOfSpeech && (
                  <span className="mt-1 inline-block text-xs text-zinc-400">
                    {card.partOfSpeech}
                  </span>
                )}
              </div>
              <span
                aria-hidden="true"
                className="hidden h-10 bg-zinc-200 sm:block dark:bg-zinc-800"
              />
              <div className="min-w-0">
                <p className="break-words font-medium">{card.meaningVi}</p>
                {card.exampleEn && (
                  <p className="mt-1 text-sm italic text-zinc-500">
                    {card.exampleEn}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!playEnglishSpeech(card.term))
                    setError("Trình duyệt chưa hỗ trợ đọc thành tiếng.");
                }}
                aria-label={`Nghe phát âm ${card.term}`}
                className="justify-self-end rounded-full p-2 text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950"
              >
                <Volume2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
