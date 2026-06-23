import { useState } from "react";

export interface Education {
  id: string;
  institution: string;
  qualification: string;
  endYear: number;
  startDate?: string;
  endDate?: string;
}

interface EducationTableProps {
  readonly education: Education[];
  onEdit?: (id:string)=> void;
}

export default function EducationTable({
  education,onEdit,
}: EducationTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 4;

  const totalPages = Math.ceil(
    education.length / rowsPerPage
  );

  const startIndex =
    (currentPage - 1) * rowsPerPage;

  const currentEducation = education.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  return (
    <div className="mt-6 border-t pt-6 flex flex-col">
      {/* Table Header */}
      <div className="grid grid-cols-3 text-sm font-semibold mb-4 px-2">
        <span>Institution</span>
        <span>Qualification</span>
        <span>Year Obtained</span>
      </div>

      {/* Table Content */}
      <div className="flex flex-col h-[200px] overflow-y-auto">
        {currentEducation.length > 0 ? (
          currentEducation.map((item) => (
            <div
              key={item.id}
              className="
                grid
                grid-cols-3
                py-3
                border-t
                text-base
                px-2
                shrink-0
              "
            >
              <span className="truncate pr-2">
                {item.institution}
              </span>

              <span className="truncate pr-2">
                {item.qualification}
              </span>
            <span className="flex items-center justify-between gap-4">
              <span>{item.endYear}</span>
              {onEdit&& (
                <button type="button" 
                onClick={()=> onEdit(item.id)}
                className="text-sm font-medium text-blue-600">Edit</button>
              )}
              </span>
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-gray-500 border-t">
            No education added yet.
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-2 pt-4 border-t">
        <button
          type="button"
          onClick={() =>
            setCurrentPage((p) =>
              Math.max(1, p - 1)
            )
          }
          disabled={currentPage === 1}
          className="
            text-sm
            font-medium
            transition
            disabled:opacity-50
            disabled:cursor-not-allowed
            hover:opacity-80
          "
          style={{ color: "var(--color-primary)" }}
        >
          Previous
        </button>

        <span className="text-sm text-gray-600">
          Page {totalPages === 0 ? 0 : currentPage} of{" "}
          {totalPages}
        </span>

        <button
          type="button"
          onClick={() =>
            setCurrentPage((p) =>
              Math.min(totalPages, p + 1)
            )
          }
          disabled={
            currentPage === totalPages ||
            totalPages === 0
          }
          className="
            text-sm
            font-medium
            transition
            disabled:opacity-50
            disabled:cursor-not-allowed
            hover:opacity-80
          "
          style={{ color: "var(--color-primary)" }}
        >
          Next
        </button>
      </div>
    </div>
  );
}