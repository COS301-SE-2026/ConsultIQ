import { useState, useEffect } from "react";
import ProjectCard from "./project-card";
import type { Project } from "../types/project.types";

interface ProjectGridProps {
  readonly projects: readonly Project[];
  readonly onViewDetails: (project: Project) => void;
}

export default function ProjectGrid({
  projects,
  onViewDetails,
}: ProjectGridProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Reset to page 1 when the filtered projects change
  useEffect(() => {
    setCurrentPage(1);
  }, [projects]);

  const totalPages = Math.ceil(projects.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentProjects = projects.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="flex flex-col gap-8 w-full">
      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-2
          xl:grid-cols-3
          gap-8
        "
      >
        {currentProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-6 mt-4 pb-8">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-5 py-2.5 rounded-lg border-2 border-solid font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}
          >
            Previous
          </button>
          <span className="text-lg font-medium" style={{ color: "var(--color-text-secondary)" }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-5 py-2.5 rounded-lg border-2 border-solid font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}