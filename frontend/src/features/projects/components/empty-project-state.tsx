export default function EmptyProjectState() {
  return (
    <div className="w-full bg-white rounded-xl p-20 text-center">
      <h2
        className="text-3xl font-bold mb-4"
        style={{ color: "var(--color-primary)" }}
      >
        <div className="h-6" />
        No Projects Found
      </h2>

      <p style={{ color: "var(--color-text-secondary)" }}>
        Try adjusting your filters or create a new project.
      </p>
      <div className= "h-6" />
    </div>
  );
}