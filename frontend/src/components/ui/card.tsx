import * as React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded
        border
        bg-white
        shadow-sm
        ${className ?? ""}
      `}
      style={{
        borderColor: "var(--color-border)",
      }}
      {...props}
    />
  );
}