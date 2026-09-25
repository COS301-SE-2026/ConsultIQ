import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import { Trash2 } from "lucide-react";

export interface Education {
  id: string;
  institution: string;
  qualification: string;
  endYear: number;
  fileName?: string;
}

interface EducationTableProps {
  readonly education: Education[];
  readonly onRemove: (id: string) => void;
}

export default function EducationTable({
  education,
  onRemove,
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
      <div className="hidden md:block overflow-x-auto">
        <table
          style={{
            tableLayout: "fixed",
            width: "100%",
            borderCollapse: "collapse"
          }}
        >
          <colgroup>
            <col style={{ width: "25%" }} />
            <col style={{ width: "25%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "25%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>


          <thead>
            <tr className="border-b text-sm font-semibold text-gray-700">
              <th
                className="p-2"
              >
                Institution
              </th>

              <th
                className="p-2"
              >
                Qualification
              </th>

              <th
                className="p-2"
              >
                Year Obtained
              </th>

              <th
                className="p-2"
              >
                Certificate
              </th>
            </tr>
          </thead>

          {/* Table Content */}
          <tbody>
            {currentEducation.length > 0 ? (
              currentEducation.map((item) => (
                <tr
                  key={item.id}
                  className="border-b"
                >

                  <td className="p-4 truncate" title={item.institution}>
                    {item.institution}
                  </td>

                  <td className="p-4 truncate" title={item.qualification}>
                    {item.qualification}
                  </td>

                  <td className="p-4 truncate">
                    {item.endYear}
                  </td>

                  <td className="p-4 truncate">
                    {item.fileName ? (
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, padding: "16px 8px" }} title={item.fileName}>{item.fileName}</span>
                    ) : (
                      <span className="text-gray-400 text-xs">No file</span>
                    )}
                  </td>

                  <td className="p-4 text-center">
                    <Button
                      variant="default"
                      onClick={() => onRemove(item.id)}
                      className=" rounded-xl"
                    >
                      <Trash2 size={18} />


                    </Button>
                  </td>

                </tr>

              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-500 border-t">
                  No education added yet.
                </td>
              </tr>

            )}
          </tbody>

        </table>


      </div>

      {/* Mobile view */}
      <div className=" block md:hidden space-y-4">
        {currentEducation.length > 0 ? (
          currentEducation.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col gap-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-gray-900 text-base">{item.qualification}</h4>
                  <p className="text-sm text-gray-600">{item.institution}</p>
                </div>
            
              <Button
                variant="default"
                onClick={() => onRemove(item.id)}
                className=" rounded-xl p-2 h-auto"
              >
                <Trash2 size={16} />
              </Button>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t">
              <span>
                <strong>Year:</strong> {item.endYear}
              </span>
              <span className="truncate max-w-[150px]">
                {item.fileName ? (
                  <span title={item.fileName}>{item.fileName}</span>
                ):(
                  "No file"
                )}
              </span>
            </div>
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-gray-500 border rounded-xl">
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