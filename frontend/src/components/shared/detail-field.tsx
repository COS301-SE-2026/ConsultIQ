interface DetailFieldProps {
  readonly label: string;
  readonly value: string;
  readonly variant?: 'default' | 'compact';
}

export function DetailField({ label, value, variant = 'default' }: DetailFieldProps) {
  const styles = variant === 'compact' 
    ? { gap: "10px", marginBottom: "0px" }  
    : { gap: "10px", marginBottom: "28px" }; 

  return (
    <div className="flex flex-col" style={styles}>
      <p
        className="font-semibold"
        style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-h4)" }}
      >
        {label}
      </p>
      <p
        className="leading-relaxed break-words"
        style={{ color: "var(--color-text-primary)", fontSize: "var(--text-h3)" }}
      >
        {value || "—"}
      </p>
    </div>
  );
}