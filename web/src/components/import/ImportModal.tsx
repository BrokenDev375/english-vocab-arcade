"use client";

import React, { useState, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { parseCsv } from "@/features/sets/import/csv-parser";
import { parseXlsx } from "@/features/sets/import/xlsx-parser";
import {
  detectColumnMapping,
  validateColumnMapping,
  type ColumnMapping,
} from "@/features/sets/import/column-mapper";
import {
  validateImportRows,
  type RowError,
  type ValidatedCard,
} from "@/features/sets/import/import-validator";
import { chunkValidatedCards } from "@/features/sets/import/import-chunker";
import {
  Upload,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  setId: string;
  onImportComplete: () => void;
  existingCardsCount?: number;
}

type ImportStep = "upload" | "mapping" | "validate" | "uploading" | "complete";

export function ImportModal({
  isOpen,
  onClose,
  setId,
  onImportComplete,
  existingCardsCount = 0,
}: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    termIndex: 0,
    meaningViIndex: 1,
  });
  const [hasHeader, setHasHeader] = useState<boolean>(true);

  const [validatedCards, setValidatedCards] = useState<ValidatedCard[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const [uploadProgress, setUploadProgress] = useState<{
    currentChunk: number;
    totalChunks: number;
    insertedCount: number;
  }>({ currentChunk: 0, totalChunks: 0, insertedCount: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep("upload");
    setFileName("");
    setRawRows([]);
    setValidatedCards([]);
    setErrors([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileProcess = async (file: File) => {
    setParseError(null);
    setFileName(file.name);

    try {
      let rows: string[][] = [];
      const lower = file.name.toLowerCase();

      if (lower.endsWith(".csv")) {
        const text = await file.text();
        rows = parseCsv(text);
      } else if (lower.endsWith(".xlsx")) {
        const buffer = await file.arrayBuffer();
        rows = await parseXlsx(buffer);
      } else {
        throw new Error("Định dạng tệp không được hỗ trợ. Vui lòng tải lên tệp .csv hoặc .xlsx.");
      }

      if (rows.length === 0) {
        throw new Error("Tệp không chứa dữ liệu hợp lệ.");
      }

      setRawRows(rows);

      // Detect mapping from first row
      const detected = detectColumnMapping(rows[0]);
      setMapping(detected);
      setStep("mapping");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi xử lý tệp";
      setParseError(msg);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleValidation = () => {
    const colCount = rawRows[0]?.length || 0;
    const check = validateColumnMapping(mapping, colCount);
    if (!check.isValid) {
      setParseError(check.error || "Cấu hình cột không hợp lệ");
      return;
    }

    setParseError(null);
    const result = validateImportRows(rawRows, mapping, { hasHeaderRow: hasHeader });
    setValidatedCards(result.validCards);
    setErrors(result.errors);
    setStep("validate");
  };

  const handleStartImport = async () => {
    if (validatedCards.length === 0) return;

    setStep("uploading");
    const batchId = `import_${Date.now().toString(36)}`;
    const chunks = chunkValidatedCards(validatedCards, batchId, existingCardsCount);

    setUploadProgress({
      currentChunk: 0,
      totalChunks: chunks.length,
      insertedCount: 0,
    });

    try {
      let totalInserted = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        setUploadProgress({
          currentChunk: i + 1,
          totalChunks: chunks.length,
          insertedCount: totalInserted,
        });

        const res = await fetch(`/api/sets/${setId}/cards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cards: chunk.cards }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `Lỗi tải lên nhóm ${i + 1}`);
        }

        const data = await res.json();
        totalInserted += data.data.length;
      }

      setUploadProgress({
        currentChunk: chunks.length,
        totalChunks: chunks.length,
        insertedCount: totalInserted,
      });

      setStep("complete");
      onImportComplete();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi trong quá trình nhập thẻ";
      setParseError(msg);
      setStep("validate");
    }
  };

  const columns = rawRows[0] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col p-6 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                Nhập từ vựng từ tệp
              </h2>
              <p className="text-xs text-zinc-500">
                Hỗ trợ định dạng CSV hoặc Excel (.xlsx) với tối đa 1.000 thẻ mỗi lần
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {parseError && (
          <div className="my-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* STEP 1: Upload */}
          {step === "upload" && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-8 sm:p-12 text-center cursor-pointer hover:border-teal-500/60 transition-colors bg-zinc-50/50 dark:bg-zinc-900/40"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />
              <Upload className="w-10 h-10 mx-auto text-zinc-400 mb-3" />
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                Kéo thả tệp CSV hoặc Excel vào đây, hoặc nhấn để chọn
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Kích thước tệp tối đa 5MB. Các cột khuyến nghị: Từ tiếng Anh, Nghĩa, Loại từ, Phiên âm, Ví dụ.
              </p>
            </div>
          )}

          {/* STEP 2: Column Mapping */}
          {step === "mapping" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Tệp: <strong className="text-zinc-800 dark:text-zinc-200">{fileName}</strong> ({rawRows.length} dòng)</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasHeader}
                    onChange={(e) => setHasHeader(e.target.checked)}
                    className="rounded text-teal-600"
                  />
                  <span>Dòng đầu tiên là tiêu đề cột</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400 block mb-1">
                    Cột từ tiếng Anh (Bắt buộc)
                  </label>
                  <select
                    value={mapping.termIndex}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, termIndex: parseInt(e.target.value, 10) }))
                    }
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 text-sm"
                  >
                    {columns.map((col, idx) => (
                      <option key={idx} value={idx}>
                        Cột {idx + 1}: {col || `[Cột ${idx + 1}]`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400 block mb-1">
                    Cột nghĩa tiếng Việt (Bắt buộc)
                  </label>
                  <select
                    value={mapping.meaningViIndex}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        meaningViIndex: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 text-sm"
                  >
                    {columns.map((col, idx) => (
                      <option key={idx} value={idx}>
                        Cột {idx + 1}: {col || `[Cột ${idx + 1}]`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400 block mb-1">
                    Cột loại từ (Tùy chọn)
                  </label>
                  <select
                    value={mapping.partOfSpeechIndex ?? -1}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setMapping((m) => ({
                        ...m,
                        partOfSpeechIndex: val === -1 ? undefined : val,
                      }));
                    }}
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 text-sm"
                  >
                    <option value={-1}>-- Bỏ qua (mặc định noun) --</option>
                    {columns.map((col, idx) => (
                      <option key={idx} value={idx}>
                        Cột {idx + 1}: {col || `[Cột ${idx + 1}]`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400 block mb-1">
                    Cột phiên âm IPA (Tùy chọn)
                  </label>
                  <select
                    value={mapping.ipaIndex ?? -1}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setMapping((m) => ({
                        ...m,
                        ipaIndex: val === -1 ? undefined : val,
                      }));
                    }}
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 text-sm"
                  >
                    <option value={-1}>-- Bỏ qua --</option>
                    {columns.map((col, idx) => (
                      <option key={idx} value={idx}>
                        Cột {idx + 1}: {col || `[Cột ${idx + 1}]`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sample preview table */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-zinc-500 block mb-1.5">
                  Xem trước 3 dòng đầu:
                </span>
                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                  <table className="w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {rawRows.slice(0, 3).map((r, rIdx) => (
                        <tr key={rIdx} className={rIdx === 0 && hasHeader ? "bg-zinc-50 dark:bg-zinc-800/50 font-bold" : ""}>
                          {r.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2 truncate max-w-[150px]">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Validate & Preview */}
          {step === "validate" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-teal-800 dark:text-teal-200 text-sm font-bold">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <span>Sẵn sàng nhập {validatedCards.length} thẻ từ vựng hợp lệ</span>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Có {errors.length} dòng không thể nhập (sẽ được bỏ qua):</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 p-2.5 border border-amber-200 dark:border-amber-900/40 text-xs">
                    {errors.map((err, idx) => (
                      <p key={idx} className="text-zinc-700 dark:text-zinc-300">
                        • Dòng {err.rowNumber}: <strong className="text-amber-800 dark:text-amber-300">{err.reason}</strong>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Uploading Progress */}
          {step === "uploading" && (
            <div className="py-8 space-y-4 text-center">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Đang gửi các gói thẻ lên hệ thống...
              </p>
              <div className="w-full h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      uploadProgress.totalChunks > 0
                        ? (uploadProgress.currentChunk / uploadProgress.totalChunks) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-xs text-zinc-500">
                Gói {uploadProgress.currentChunk} / {uploadProgress.totalChunks} (Đã thêm {uploadProgress.insertedCount} thẻ)
              </p>
            </div>
          )}

          {/* STEP 5: Complete */}
          {step === "complete" && (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                Nhập từ vựng thành công!
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Đã thêm thành công {uploadProgress.insertedCount} thẻ mới vào học phần của bạn.
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          {step !== "uploading" && step !== "complete" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={step === "upload" ? onClose : handleReset}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              {step === "upload" ? "Hủy" : "Chọn tệp khác"}
            </Button>
          )}

          {step === "mapping" && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleValidation}
            >
              <span>Kiểm tra & Xem trước</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}

          {step === "validate" && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={validatedCards.length === 0}
              onClick={handleStartImport}
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              Bắt đầu nhập {validatedCards.length} thẻ
            </Button>
          )}

          {step === "complete" && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onClose}
              className="ml-auto"
            >
              Hoàn tất
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
