import React, { Suspense } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { DemoBanner } from "../ui/DemoBanner";

export interface AppShellProps {
  children: React.ReactNode;
  showDemoBanner?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  showDemoBanner = true,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-teal-500 selection:text-white transition-colors">
      {showDemoBanner && <DemoBanner />}
      <Suspense
        fallback={
          <header className="sticky top-0 z-40 w-full h-16 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md" />
        }
      >
        <Navbar />
      </Suspense>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {children}
      </main>
      <Footer />
    </div>
  );
};
