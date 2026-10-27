"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  BookPlus,
  Info,
} from "lucide-react";

interface CardRow {
  term: string;
  meaningVi: string;
  partOfSpeech: "noun" | "verb" | "adjective" | "adverb" | "phrase" | "other";
  ipa: string;
  exampleEn: string;
}

export default function NewSetPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [cefrLevel, setCefrLevel] = useState<"A1" | "A2" | "B1" | "mixed">("A1");
  const [isPublic, setIsPublic] = useState(false);

  const [cards, setCards] = useState<CardRow[]>([
    { term: "", meaningVi: "", partOfSpeech: "noun", ipa: "", exampleEn: "" },
    { term: "", meaningVi: "", partOfSpeech: "verb", ipa: "", exampleEn: "" },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCardRow = () => {
    setCards((prev) => [
      ...prev,
      { term: "", meaningVi: "", partOfSpeech: "noun", ipa: "", exampleEn: "" },
    ]);
  };

  const removeCardRow = (index: number) => {
    if (cards.length <= 1) return;
    setCards((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCardRow = (index: number, field: keyof CardRow, value: string) => {
    setCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !topic.trim()) {
      setError("Vui lòng điền tiêu đề và chủ đề của học phần.");
      return;
    }

    const validCards = cards.filter(
      (c) => c.term.trim().length > 0 && c.meaningVi.trim().length > 0
    );

    if (validCards.length === 0) {
      setError("Vui lòng nhập ít nhất 1 thẻ từ vựng hoàn chỉnh (từ và nghĩa).");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Create set
      const setRes = await fetch("/api/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          topic,
          cefrLevel,
          isPublic,
        }),
      });

      const setData = await setRes.json();
      if (!setRes.ok) {
        throw new Error(setData.error || "Tạo học phần không thành công");
      }

      const newSetId = setData.data.id;

      // 2. Add cards
      const cardsRes = await fetch(`/api/sets/${newSetId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cards: validCards.map((c, idx) => ({
            term: c.term.trim(),
            meaningVi: c.meaningVi.trim(),
            partOfSpeech: c.partOfSpeech,
            ipa: c.ipa.trim() || null,
            exampleEn: c.exampleEn.trim() || null,
            acceptedAnswers: [c.term.trim()],
            position: idx,
          })),
        }),
      });

      if (!cardsRes.ok) {
        const cardErr = await cardsRes.json();
        throw new Error(cardErr.error || "Thêm thẻ thất bại");
      }

      router.push(`/sets/${newSetId}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại Bảng điều khiển</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-zinc-50">
              Tạo bộ từ vựng mới
            </h1>
          </div>

          <Button type="submit" variant="primary" size="lg" isLoading={isLoading}>
            <Save className="w-4 h-4 mr-1.5" />
            Lưu học phần
          </Button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Set Information */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800 font-bold text-sm text-zinc-900 dark:text-zinc-100">
            <BookPlus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Thông tin học phần</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="set-title"
              label="Tiêu đề học phần *"
              placeholder="VD: 50 Từ vựng Giao tiếp Khách sạn"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <Input
              id="set-topic"
              label="Chủ đề *"
              placeholder="VD: Du lịch, Công sở, Ẩm thực..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
          </div>

          <Input
            id="set-desc"
            label="Mô tả học phần"
            placeholder="Tóm tắt nội dung và mục tiêu bài học..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5">
                Khung trình độ CEFR
              </label>
              <select
                value={cefrLevel}
                onChange={(e) =>
                  setCefrLevel(e.target.value as "A1" | "A2" | "B1" | "mixed")
                }
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100"
              >
                <option value="A1">A1 — Cơ bản</option>
                <option value="A2">A2 — Sơ cấp</option>
                <option value="B1">B1 — Trung cấp</option>
                <option value="mixed">Hỗn hợp (Mixed)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                id="set-public"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-5 h-5 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              <label htmlFor="set-public" className="text-sm font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer">
                Công khai học phần trên trang Khám phá
              </label>
            </div>
          </div>
        </Card>

        {/* Cards Editor Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Danh sách thẻ từ vựng ({cards.length})
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={addCardRow}>
              <Plus className="w-4 h-4 mr-1" />
              Thêm thẻ
            </Button>
          </div>

          <div className="space-y-3">
            {cards.map((card, idx) => (
              <Card key={idx} className="p-4 sm:p-5 space-y-3 relative group">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400 pb-1">
                  <span>Thẻ #{idx + 1}</span>
                  {cards.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCardRow(idx)}
                      className="text-zinc-400 hover:text-rose-500 transition-colors p-1"
                      aria-label={`Xóa thẻ ${idx + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Từ tiếng Anh *"
                    placeholder="VD: delicious"
                    value={card.term}
                    onChange={(e) => updateCardRow(idx, "term", e.target.value)}
                    required
                  />

                  <Input
                    label="Nghĩa tiếng Việt *"
                    placeholder="VD: ngon miệng"
                    value={card.meaningVi}
                    onChange={(e) => updateCardRow(idx, "meaningVi", e.target.value)}
                    required
                  />

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5">
                      Từ loại
                    </label>
                    <select
                      value={card.partOfSpeech}
                      onChange={(e) =>
                        updateCardRow(idx, "partOfSpeech", e.target.value)
                      }
                      className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="noun">Danh từ (noun)</option>
                      <option value="verb">Động từ (verb)</option>
                      <option value="adjective">Tính từ (adjective)</option>
                      <option value="adverb">Phó từ (adverb)</option>
                      <option value="phrase">Cụm từ (phrase)</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <Input
                    label="Phiên âm IPA (Tùy chọn)"
                    placeholder="VD: /dɪˈlɪʃ.əs/"
                    value={card.ipa}
                    onChange={(e) => updateCardRow(idx, "ipa", e.target.value)}
                  />

                  <Input
                    label="Ví dụ ngữ cảnh (Tùy chọn)"
                    placeholder="VD: The cake is very delicious."
                    value={card.exampleEn}
                    onChange={(e) => updateCardRow(idx, "exampleEn", e.target.value)}
                  />
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center pt-2">
            <Button type="button" variant="outline" size="md" onClick={addCardRow} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-1.5" />
              Thêm một thẻ nữa
            </Button>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
          <Info className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
          <span>
            Học phần của bạn được lưu trữ an toàn. Khi công khai trên Khám phá, tên và thông tin tài khoản của bạn sẽ được ẩn hoàn toàn để bảo đảm tính riêng tư.
          </span>
        </div>
      </form>
    </AppShell>
  );
}
