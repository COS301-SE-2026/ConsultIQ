import { Card } from "../../../components/ui/card";
import type { Project } from "../types/project.types";

interface ProjectLocationSectionProps {
  readonly project: Project;
}

export default function ProjectLocationSection({
  project,
}: ProjectLocationSectionProps) {
  return (
    <Card style={{ padding: "20px", border: "none" }}>
      <h3
        className="text-3xl font-bold mb-8"
        style={{ color: "var(--color-primary)" }}
      >
        Location
      </h3>
      <div className="h-2" />

      <div className=" text-lg grid grid-cols-1 md:grid-cols-2 gap-4">
        <Info label="Address Line 1" value={project.location.addressLine1} />
        <Info label="Address Line 2" value={project.location.addressLine2} />
        <Info label="Suburb" value={project.location.suburb} />
        <Info label="City" value={project.location.city} />
        <Info label="Province" value={project.location.province} />
        <Info label="Postal Code" value={project.location.postalCode} />
      </div>
    </Card>
  );
}

function Info({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div>
      <p className="font-semibold mb-2">{label}</p>

      <p style={{ color: "var(--color-text-secondary)" }}>
        {value}
      </p>
    </div>
  );
}