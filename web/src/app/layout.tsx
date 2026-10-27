import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "English Vocab Arcade — Học từ vựng tiếng Anh A1–B1 & Game Phản Xạ",
  description:
    "Web học từ vựng và câu tiếng Anh A1–B1 cho người Việt với flashcard, bài tập lặp lại ngắt quãng và minigame gõ từ Word Blaster.",
  keywords: ["tiếng Anh", "từ vựng A1 B1", "word blaster", "flashcard", "arcade vocab"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans"><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
