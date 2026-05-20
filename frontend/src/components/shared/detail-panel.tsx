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
        className="relative bg-white h-full overflow-y-auto w-1/2 max-w-2xl"
        style={{ padding: "40px 48px" }}
      >
        {/* Back button */}
        <button
          onClick={onClose}
          className="flex items-center gap-2 font-medium hover:opacity-70 transition"
          style={{
            color: "var(--color-primary)",
            fontSize: "var(--text-h4)",
            marginBottom: "32px",
          }}
          type="button"
        >
          <ArrowLeft size={18} /> Back
        </button>

        <h1
          className="font-bold"
          style={{
            color: "var(--color-primary)",
            fontSize: "32px",
            marginBottom: "36px",
          }}
        >
          {title}
        </h1>

        {children}
      </div>
    </div>
  );
}