"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import type { Database } from "@/types/database.generated";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  BookOpen,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { Suspense, useCallback } from "react";
import { ImportModal } from "@/components/import/ImportModal";

type CardRow = Database["public"]["Tables"]["vocabulary_cards"]["Row"];

function EditSetContent() {
  const params = useParams();
  const router = useRouter();
  const setId = params.id as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [cefrLevel, setCefrLevel] = useState<"A1" | "A2" | "B1" | "mixed">("A1");
  const [isPublic, setIsPublic] = useState(false);
  const [contentRevision, setContentRevision] = useState<number>(1);

  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // New card row to add
  const [newTerm, setNewTerm] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [newPos, setNewPos] = useState<"noun" | "verb" | "adjective" | "adverb" | "phrase" | "other">("noun");

  const refreshCards = useCallback(async () => {
    if (!setId) return;
    try {
      const cardsRes = await fetch(`/api/sets/${setId}/cards?limit=500`);
      if (cardsRes.ok) {
        const cardsData = await cardsRes.json();
        setCards(cardsData.data);
      }
    } catch {
      // ignore
    }
  }, [setId]);

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      try {
        const setRes = await fetch(`/api/sets/${setId}`);
        if (!setRes.ok) throw new Error("Không thể tải thông tin học phần");
        const setData = await setRes.json();

        if (ignore) return;
        setTitle(setData.data.title);
        setDescription(setData.data.description || "");
        setTopic(setData.data.topic);
        setCefrLevel(setData.data.cefr_level);
        setIsPublic(setData.data.is_public);
        setContentRevision(setData.data.content_revision);

        const cardsRes = await fetch(`/api/sets/${setId}/cards?limit=500`);
        if (!cardsRes.ok) throw new Error("Không thể tải danh sách thẻ");
        const cardsData = await cardsRes.json();

        if (ignore) return;
        setCards(cardsData.data);
      } catch (err: unknown) {
        if (ignore) return;
        const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra";
        setError(msg);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (setId) {
      void fetchData();
    }

    return () => {
      ignore = true;
    };
  }, [setId]);

  const handleSaveSetMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/sets/${setId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          topic,
          cefrLevel,
          isPublic,
          expectedRevision: contentRevision,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Cập nhật học phần thất bại");
      }

      setContentRevision(resData.data.content_revision);
      setSuccessMsg("Đã lưu thông tin học phần thành công!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCard = async (cardId: string, updates: Partial<CardRow>) => {
    try {
      const res = await fetch(`/api/sets/${setId}/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Cập nhật thẻ thất bại");
      }

      const updated = await res.json();
      setCards((prev) => prev.map((c) => (c.id === cardId ? updated.data : c)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi sửa thẻ";
      setError(msg);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa thẻ từ vựng này?")) return;

    try {
      const res = await fetch(`/api/sets/${setId}/cards/${cardId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Xóa thẻ thất bại");
      }

      setCards((prev) => prev.filter((c) => c.id !== cardId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi xóa thẻ";
      setError(msg);
    }
  };

  const handleAddNewCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim() || !newMeaning.trim()) return;

    try {
      const res = await fetch(`/api/sets/${setId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cards: [
            {
              term: newTerm.trim(),
              meaningVi: newMeaning.trim(),
              partOfSpeech: newPos,
              position: cards.length,
            },
          ],
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Thêm thẻ thất bại");
      }

      const inserted = await res.json();
      setCards((prev) => [...prev, ...inserted.data]);
      setNewTerm("");
      setNewMeaning("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi thêm thẻ";
      setError(msg);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingState message="Đang tải dữ liệu học phần..." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href={`/sets/${setId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại học phần</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-zinc-50">
              Chỉnh sửa học phần
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setShowImportModal(true)}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-teal-600 dark:text-teal-400" />
              Nhập CSV / Excel
            </Button>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => router.push(`/sets/${setId}`)}
            >
              Hoàn tất & Xem trước
            </Button>
          </div>
        </div>

        {error && <ErrorAlert message={error} />}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Set Metadata Editor */}
        <form onSubmit={handleSaveSetMetadata}>
          <Card className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 font-bold text-sm text-zinc-900 dark:text-zinc-100">
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Cài đặt thông tin chung (Revision: {contentRevision})</span>
              </span>
              <Button type="submit" variant="primary" size="sm" isLoading={saving}>
                <Save className="w-3.5 h-3.5 mr-1" />
                Lưu cài đặt
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="edit-title"
                label="Tiêu đề học phần *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <Input
                id="edit-topic"
                label="Chủ đề *"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />
            </div>

            <Input
              id="edit-desc"
              label="Mô tả học phần"
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
                  id="edit-public"
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="edit-public" className="text-sm font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer">
                  Công khai học phần trên trang Khám phá
                </label>
              </div>
            </div>
          </Card>
        </form>

        {/* Existing Cards Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Các thẻ từ vựng hiện có ({cards.length})
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-teal-600 dark:text-teal-400" />
              Nhập từ tệp
            </Button>
          </div>

          <div className="space-y-3">
            {cards.map((card, idx) => (
              <Card key={card.id} className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400 pb-1">
                  <span>Thẻ #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCard(card.id)}
                    className="text-zinc-400 hover:text-rose-500 transition-colors p-1"
                    aria-label={`Xóa thẻ ${card.term}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Từ tiếng Anh"
                    value={card.term}
                    onChange={(e) =>
                      setCards((prev) =>
                        prev.map((c) =>
                          c.id === card.id ? { ...c, term: e.target.value } : c
                        )
                      )
                    }
                    onBlur={(e) =>
                      handleUpdateCard(card.id, { term: e.target.value })
                    }
                  />

                  <Input
                    label="Nghĩa tiếng Việt"
                    value={card.meaning_vi}
                    onChange={(e) =>
                      setCards((prev) =>
                        prev.map((c) =>
                          c.id === card.id
                            ? { ...c, meaning_vi: e.target.value }
                            : c
                        )
                      )
                    }
                    onBlur={(e) =>
                      handleUpdateCard(card.id, { meaning_vi: e.target.value })
                    }
                  />

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5">
                      Từ loại
                    </label>
                    <select
                      value={card.part_of_speech}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCards((prev) =>
                          prev.map((c) =>
                            c.id === card.id
                              ? { ...c, part_of_speech: val }
                              : c
                          )
                        );
                        handleUpdateCard(card.id, { part_of_speech: val });
                      }}
                      className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="noun">noun</option>
                      <option value="verb">verb</option>
                      <option value="adjective">adjective</option>
                      <option value="adverb">adverb</option>
                      <option value="phrase">phrase</option>
                      <option value="other">other</option>
                    </select>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Add New Card Form */}
        <Card className="p-5 border-dashed border-2 border-zinc-300 dark:border-zinc-700 space-y-4">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Thêm thẻ mới vào học phần</span>
          </h3>

          <form onSubmit={handleAddNewCard} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Từ mới *"
                placeholder="VD: adventure"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                required
              />

              <Input
                label="Nghĩa tiếng Việt *"
                placeholder="VD: cuộc phiêu lưu"
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                required
              />

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5">
                  Từ loại
                </label>
                <select
                  value={newPos}
                  onChange={(e) =>
                    setNewPos(e.target.value as "noun" | "verb" | "adjective" | "adverb" | "phrase" | "other")
                  }
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  <option value="noun">noun</option>
                  <option value="verb">verb</option>
                  <option value="adjective">adjective</option>
                  <option value="adverb">adverb</option>
                  <option value="phrase">phrase</option>
                  <option value="other">other</option>
                </select>
              </div>
            </div>

            <Button type="submit" variant="primary" size="md">
              <Plus className="w-4 h-4 mr-1.5" />
              Thêm thẻ này
            </Button>
          </form>
        </Card>
      </div>

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        setId={setId}
        onImportComplete={refreshCards}
        existingCardsCount={cards.length}
      />
    </AppShell>
  );
}

export default function EditSetPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <LoadingState message="Đang tải giao diện chỉnh sửa..." />
        </AppShell>
      }
    >
      <EditSetContent />
    </Suspense>
  );
}
