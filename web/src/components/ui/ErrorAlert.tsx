import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "./Button";

export interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title = "Đã xảy ra lỗi",
  message,
  onRetry,
}) => {
  return (
    <div
      role="alert"
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-rose-800 dark:text-rose-300">
            {title}
          </h4>
          <p className="text-xs text-rose-700/90 dark:text-rose-300/80 mt-0.5 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-800 dark:text-rose-200 shrink-0 self-end sm:self-center"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Thử lại
        </Button>
      )}
    </div>
  );
};
