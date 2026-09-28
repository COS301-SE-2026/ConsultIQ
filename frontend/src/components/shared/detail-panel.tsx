import { ArrowLeft } from "lucide-react";
import { useCallback } from "react";   
import type { ReactNode } from "react"

interface DetailPanelProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

export function DetailPanel({ title, onClose, children }: DetailPanelProps) {
  const handleBackdropKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape") {
      onClose();
    }
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop button */}
      <button
        className="absolute inset-0 w-full h-full cursor-pointer"
        style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
        onClick={onClose}
        onKeyDown={handleBackdropKeyDown}
        aria-label="Close panel"
        type="button"
      />
      
      {/* Panel */}
      <div
        className="relative bg-white h-full overflow-y-auto overflow-x-hidden overscroll-y-none  w-full md:w-1/2 max-w-2xl p-5 sm:px-12 sm:py-10"
      >
        {/* Back button */}
        <button
          onClick={onClose}
          className="flex items-center gap-2 font-medium hover:opacity-70 transition mb-6 sm:mb-8"
          style={{
            color: "var(--color-primary)",
            fontSize: "var(--text-h4)",
          }}
          type="button"
        >
          <ArrowLeft size={18} /> Back
        </button>

        <h1
          className="font-bold text-2xl sm:text-[32px] mb-6 sm:mb-9"
          style={{
            color: "var(--color-primary)",
          }}
        >
          {title}
        </h1>

        {children}
      </div>
    </div>
  );
}