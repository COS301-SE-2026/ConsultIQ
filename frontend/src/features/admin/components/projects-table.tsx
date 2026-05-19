import { Eye, Trash2 } from "lucide-react";
import type { AdminProject } from "../types/admin.types";

interface ProjectsTableProps {
  projects: AdminProject[];
  onView: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function ProjectsTable({
  projects,
  onView,
  onRemove,
}: Readonly<ProjectsTableProps>) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      <table className="w-full">
        <thead
          className="border-b"
          style={{
            borderColor:
              "var(--color-border)",
          }}
        >
          <tr>
            <th className="text-left px-6 py-4">
              Project
            </th>

            <th className="text-left px-6 py-4">
              Client
            </th>

            <th className="text-left px-6 py-4">
              Budget
            </th>

            <th className="text-left px-6 py-4">
              Team Size
            </th>

            <th className="text-left px-6 py-4">
              Location
            </th>

            <th className="text-left px-6 py-4">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {projects.map((project) => (
            <tr
              key={project.id}
              className="border-b"
              style={{
                borderColor:
                  "var(--color-border)",
              }}
            >
              <td className="px-6 py-5">
                {project.name}
              </td>

              <td className="px-6 py-5">
                {project.clientName}
              </td>

              <td className="px-6 py-5">
                R
                {project.budget.toLocaleString()}
              </td>

              <td className="px-6 py-5">
                {project.teamSize}
              </td>

              <td className="px-6 py-5">
                {project.location}
              </td>

              <td className="px-6 py-5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      onView(project.id)
                    }
                    className="p-2 rounded-lg border"
                  >
                    <Eye size={18} />
                  </button>

                  <button
                    onClick={() =>
                      onRemove(project.id)
                    }
                    className="p-2 rounded-lg border"
                  >
                    <Trash2
                      size={18}
                      className="text-red-600"
                    />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}