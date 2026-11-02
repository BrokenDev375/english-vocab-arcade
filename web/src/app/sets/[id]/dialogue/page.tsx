import { Suspense } from "react";
import { DialoguePractice } from "@/components/study/DialoguePractice";
export default function DialoguePage() { return <Suspense fallback={<p role="status">Đang mở hội thoại...</p>}><DialoguePractice /></Suspense>; }
