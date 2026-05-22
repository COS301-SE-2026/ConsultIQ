export default function EmptyProjectState() {
  return (
    <div className="w-full bg-white border rounded-2xl p-20 text-center">
      <h2
        className="text-3xl font-bold mb-4"
        style={{ color: "var(--color-primary)" }}
      >
        No Projects Found
      </h2>

      <p style={{ color: "var(--color-text-secondary)" }}>
        Try adjusting your filters or create a new project.
      </p>
    </div>
  );
}