"use client";
import { Suspense } from "react";
import { AiPractice } from "@/components/study/AiPractice";
export default function Page() { return <Suspense fallback={<p>Đang tải...</p>}><AiPractice mode="grammar" /></Suspense>; }
