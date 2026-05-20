interface AttachmentDisplayProps {
  readonly attachmentName: string;
}

export function AttachmentDisplay({ attachmentName }: AttachmentDisplayProps) {
  return (
    <div className="flex flex-col" style={{ gap: "12px" }}>
      <p
        className="font-semibold"
        style={{ color: "var(--color-secondary)", fontSize: "var(--text-h4)" }}
      >
        Attachments
      </p>
      <div
        className="flex items-center gap-4 rounded-xl border"
        style={{
          padding: "16px 20px",
          borderColor: "var(--color-border)",
        }}
      >
        {/* File icon */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span style={{ color: "var(--color-text-primary)", fontSize: "var(--text-h4)" }}>
          <strong>{attachmentName.replace(".pdf", "")}</strong>
          <span style={{ color: "var(--color-text-secondary)" }}>.pdf</span>
        </span>
      </div>
    </div>
  );
}