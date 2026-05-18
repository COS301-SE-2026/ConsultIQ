import { Search } from "lucide-react";

interface SearchBarProps {
  readonly value: string;
  readonly placeholder?: string;
  readonly onChange: (value: string) => void;
}

export default function SearchBar({
  value,
  placeholder = "Search...",
  onChange,
}: SearchBarProps) {
  return (
    <div className="relative w-full">
      <Search
        className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        size={22}
      />

      <input
        id="search"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-16 pr-4 rounded border bg-white text-lg outline-none transition"
        style={{
            borderColor: "var(--color-border)",
            color: "var(--color-text-primary)",
            paddingLeft: "60px",
        }}
        />
    </div>
  );
}