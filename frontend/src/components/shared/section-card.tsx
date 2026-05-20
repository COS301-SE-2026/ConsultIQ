import type { ReactNode } from "react";

interface SectionCardProps {
  readonly title: string;
  readonly children: ReactNode;
}

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <div
      className="bg-white rounded-2xl w-full flex flex-col"
      style={{
        padding: "28px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        gap: "28px",
      }}
    >
      <h2
        className="font-bold"
        style={{ color: "var(--color-primary)", fontSize: "22px" }}
      >
        {title}
      </h2>

      <hr style={{ borderColor: "var(--color-border)" }} />

      {children}
    </div>
  );
}