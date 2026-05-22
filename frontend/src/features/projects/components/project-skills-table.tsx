import { useState } from "react";

interface TableSkill {
  id?: string;
  name: string;
  competency: string;
  years: number;
  mandatory?: boolean;
}


interface ProjectSkillsTableProps {
  readonly skills: TableSkill[];
}

export default function ProjectSkillsTable({ skills }: ProjectSkillsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 4;

  const totalPages = Math.ceil(skills.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentSkills = skills.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="mt-6 border-t pt-6 flex flex-col">

      <div className="grid grid-cols-4 text-sm font-semibold mb-4 px-2">
        <span>Skill</span>
        <span>Competency</span>
        <span>Years</span>
        <span>Mandatory</span>
      </div>

      <div className="flex flex-col h-[200px] overflow-y-auto">
        {currentSkills.length > 0 ? (
          currentSkills.map((skill, index) => (
            <div
              key={index}
              className="grid grid-cols-4 py-3 border-t text-base px-2 shrink-0"
            >
              <span className="truncate pr-2">{skill.name}</span>
              <span className="truncate pr-2">{skill.competency}</span>
              <span>{skill.years}</span>
              {/* Show a clear Yes/No instead of a raw boolean */}
              <span>{skill.mandatory === undefined ? "—" : skill.mandatory ? "Yes" : "No"}</span>
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-gray-500 border-t">
            No skills added yet.
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-2 pt-4 border-t">
        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80"
          style={{ color: "var(--color-primary)" }}
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">
          Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80"
          style={{ color: "var(--color-primary)" }}
        >
          Next
        </button>
      </div>
    </div>
  );
}