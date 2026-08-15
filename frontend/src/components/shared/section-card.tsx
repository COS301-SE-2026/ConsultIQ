import type { ReactNode } from "react";

interface SectionCardProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly edit?:ReactNode;
}

export function SectionCard({ title, children, edit }: SectionCardProps) {
  return (
    <div
      className="bg-white rounded-2xl w-full flex flex-col"
      style={{
        padding: "28px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        gap: "28px",
      }}
    >

    <div className = "flex justify-between items-center w-full">
      <h2
        className="font-bold"
        style={{ color: "var(--color-primary)", fontSize: "22px" }}
      >
        {title}
      </h2>

      {edit && <div>{edit}</div> }
    </div>

      <hr style={{ borderColor: "var(--color-border)" }} />

      {children}
    </div>
  );
}