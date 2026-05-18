import { Card } from "../../../components/ui/card";
import type { Project } from "../types/project.types";

interface ProjectOverviewSectionProps {
  readonly project: Project;
}

export default function ProjectOverviewSection({
  project,
}: ProjectOverviewSectionProps) {
  return (
    <Card style={{ padding: "20px", border: "none"}}>
      <h3
        className="text-3xl font-bold mb-8"
        style={{ color: "var(--color-primary)" }}
      >
        Overview
      </h3>
    <div className="h-2"/>
      <div className=" text-lg grid grid-cols-1 md:grid-cols-2 gap-4">
        <Info label="Project Name" value={project.name} />
        <Info label="Client Name" value={project.clientName} />
        <Info label="Team Size" value={String(project.teamSize)} />
        <Info label="Allocation %" value={`${project.allocation}%`} />
        <Info label="Budget" value={`R${project.budget}`} />
        <Info label="Start Date" value={project.startDate} />
        <Info label="End Date" value={project.endDate} />
      </div>

      <div className="mt-8">
        <div className="h-2"/>
        <p className=" text-lg font-semibold mb-2">Description</p>

        <p  className="text-lg" style={{ color: "var(--color-text-secondary)" }}>
          {project.description}
        </p>
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