import React from "react";

export interface LoadingStateProps {
  message?: string;
  subMessage?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Đang tải dữ liệu...",
  subMessage = "Vui lòng chờ trong giây lát",
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center" role="status" aria-live="polite">
      <div className="relative w-12 h-12 mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-zinc-200 dark:border-zinc-800" />
        <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-base font-medium text-zinc-800 dark:text-zinc-200">{message}</p>
      {subMessage && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{subMessage}</p>
      )}
    </div>
  );
};
