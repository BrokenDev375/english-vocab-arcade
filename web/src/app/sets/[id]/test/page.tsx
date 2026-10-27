"use client";
import { Suspense } from "react";
import { VocabularyPractice } from "@/components/study/VocabularyPractice";
export default function TestPage() { return <Suspense fallback={<p>Đang tải...</p>}><VocabularyPractice mode="test" /></Suspense>; }
