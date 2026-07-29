import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import {Trash2 } from "lucide-react";

export interface Education {
  id: string;
  institution: string;
  qualification: string;
  endYear: number;
  fileName?:string;
}

interface EducationTableProps {
  readonly education: Education[];
  readonly onRemove : (id:string) => void;
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
      <table
        style={{
          tableLayout: "fixed",
          width: "100%",
          borderCollapse: "collapse"
        }}
      >
        <colgroup>
          <col 
            style ={{width:"25%"}}
          />
          <col 
            style ={{width:"25%"}}
          />
          <col 
            style ={{width:"15%"}}
          />
          <col 
            style ={{width:"25%"}}
          />
           <col 
            style ={{width:"10%"}}
          />
        </colgroup>

        
        <thead>
        <tr>
          <th
            style={{ 
              textAlign: "left",
              padding: "8px"
            }}
          >
            Institution
          </th>

          <th
            style={{ 
              textAlign: "left",
              padding: "8px"
            }}
          >
            Qualification
          </th>

           <th
            style={{ 
              textAlign: "left",
              padding: "8px"
            }}
          >
            Year Obtained
          </th>

           <th
            style={{ 
              textAlign: "left",
              padding: "8px"
            }}
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
               style={{
                  padding: "6px 12px",
                  minWidth: 0
                }}
              >

              <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",maxWidth: 0, padding:"16px 8px" }} title={item.institution}>
                {item.institution}
              </td>

              <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",maxWidth: 0,padding:"16px 8px" }} title={item.qualification}>
                {item.qualification}
              </td>

              <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",maxWidth: 0,padding:"16px 8px" }} >
                {item.endYear}
              </td>

              <td style={{ overflow: "hidden", minWidth: 0 }}>
                {item.fileName ? (
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",minWidth: 0,padding:"16px 8px" }} title={item.fileName}>{item.fileName}</span>
                ):(
                    <span className="text-gray-400 text-xs">No file</span>
                )}
              </td>

              <td>
                 <Button
                  variant="default"
                  onClick={() => onRemove(item.id)}
                  className=" rounded-xl"
                >
                  <Trash2 size={18}/>

                  
                </Button>
              </td>
               
            </tr>

          ))
        ) : (
          <tr>
            <td  colSpan={5} className="py-4 text-center text-gray-500 border-t">
              No education added yet.
            </td> 
          </tr>
          
        )}
     </tbody>

    </table>

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