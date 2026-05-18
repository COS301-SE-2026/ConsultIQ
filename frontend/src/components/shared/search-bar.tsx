import { Search, SlidersHorizontal } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
}

function SearchBar({ value, onChange, placeholder = "Search...", onFilterClick }: SearchBarProps) {
  return (
    <div className="flex items-center gap-3">
     
      <div
        className="flex-1 flex items-center gap-3 bg-white rounded-xl"
        style={{
          border: "1px solid var(--color-border)",
          height: "52px",
          padding: "0 16px",
        }}
      >
        <Search size={18} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            padding: 0,
            background: "transparent",
            fontSize: "16px",
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-primary)",
          }}
        />
      </div>

      {/* Filters button */}
      <button
        onClick={onFilterClick}
        className="flex items-center gap-2 bg-white rounded-xl font-medium transition hover:opacity-80"
        style={{
          border: "1px solid var(--color-border)",
          height: "52px",
          padding: "0 20px",
          fontSize: "16px",
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-primary)",
        }}
      >
        <SlidersHorizontal size={18} style={{ color: "var(--color-primary)" }} />
        Filters
      </button>
    </div>
  );
}

export default SearchBar;
