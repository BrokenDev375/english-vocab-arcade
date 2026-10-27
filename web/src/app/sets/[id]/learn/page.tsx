"use client";
import { Suspense } from "react";
import { VocabularyPractice } from "@/components/study/VocabularyPractice";
export default function LearnPage() { return <Suspense fallback={<p>Đang tải...</p>}><VocabularyPractice mode="learn" /></Suspense>; }
