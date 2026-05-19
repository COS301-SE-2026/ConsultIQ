interface AdminTabsProps {
  activeTab: "users" | "projects";
  onTabChange: (
    tab: "users" | "projects"
  ) => void;
}

export default function AdminTabs({
  activeTab,
  onTabChange,
}: Readonly<AdminTabsProps>) {
  return (
    <div className="flex items-center gap-8 border-b pb-4 mb-8">
      <button
        onClick={() =>
          onTabChange("users")
        }
        className={`text-lg font-semibold pb-2 transition ${
          activeTab === "users"
            ? "border-b-2"
            : "opacity-60"
        }`}
        style={{
          color: "var(--color-primary)",
          borderColor:
            activeTab === "users"
              ? "var(--color-primary)"
              : "transparent",
        }}
      >
        Users
      </button>

      <button
        onClick={() =>
          onTabChange("projects")
        }
        className={`text-lg font-semibold pb-2 transition ${
          activeTab === "projects"
            ? "border-b-2"
            : "opacity-60"
        }`}
        style={{
          color: "var(--color-primary)",
          borderColor:
            activeTab === "projects"
              ? "var(--color-primary)"
              : "transparent",
        }}
      >
        Projects
      </button>
    </div>
  );
}