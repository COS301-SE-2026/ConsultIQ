import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import {File} from "lucide-react";
import { useState } from "react";


export interface Project {
  id: string;
  projectName: string;
  clientName: string;
  budget: string;
 
}

const MockData: Project[]=[
  {
    id:"pro-00001",
    projectName: "E-Commerce Upgrade Platform",
    clientName: "RetailCo SA",
    budget: "850000",
  },

  {
    id:"pro-00002",
    projectName: "Logistics Database Synchronization",
    clientName: "FreightLink Africa",
    budget: "620000",
  },

  {
    id:"pro-00003",
    projectName: "Fleet tracking mobile app",
    clientName: "TransRoute logistics",
    budget: "450000",
  },

  {
    id: "pro-00004",
    projectName:"Mobile banking app",
    clientName:"FinTrust Bank",
    budget:"800000",
  },

   {
    id: "pro-00005",
    projectName:"Healthcare data integration platform",
    clientName:"MedConnect SA",
    budget:"720000",
  },

   {
    id: "pro-00006",
    projectName:"Smart inventory management system",
    clientName:"RetailNet Solutions",
    budget:"310000",
  },
];

interface ProjectTabProps {
  readonly searchQuery?: string;
  readonly budgetSort?: "asc" | "desc" | "";
}


export default function ProjectsTab({searchQuery= "", budgetSort = ""}: ProjectTabProps) {

  let filtered = MockData.filter((p) => {
     const query = searchQuery.toLowerCase();
     return !query || p.projectName.toLowerCase().includes(query) || p.clientName.toLowerCase().includes(query);
  });

  if (budgetSort === "asc") filtered = [...filtered].sort ((a,b) => Number(a.budget) - Number(b.budget));
  if (budgetSort === "desc") filtered = [...filtered].sort ((a,b) => Number(b.budget) - Number(a.budget));

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE= 5;

  const totalPages= Math.ceil(filtered.length/ITEMS_PER_PAGE);
  const startIndex= (currentPage -1) * ITEMS_PER_PAGE;
  const currentItems = filtered.slice(startIndex,startIndex+ITEMS_PER_PAGE);
  return (
    <Card 
      className="w-full bg-white overflow-hidden "
      style={{
         padding: "28px",
         border: " 1px solid #f1f5f9"
      }}
      >
        <div 
          className="flex items-center justify-between px-8 py-5 "
          style={{
            borderColor: "#f1f5f9",
            padding: "8px"
          }}
        >
          <h2 className="font-bold">Projects</h2>
          
          
        </div>

      <div className="w-full overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-4 text-left">
            <thead>
              <tr className="bg-[#F5F9FF] h-6">
                <th className="px-8 py-4 font-bold text-[16px]">Project name</th>
                <th className="px-8 py-4 font-bold text-[16px]">Client</th>
                <th className="px-8 py-4 font-bold text-[16px]">Budget</th>
                <th className="px-8 py-4 font-bold text-[16px]">Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentItems.map((project)=>(
                <tr key={project.id}  className="border-b hover:bg-slate-50 border-b-gray-200 ">
                  <td className="flex items-center gap-4 px-8 py-4">
                    <div  
                      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
                      style={{
                        width: "30px",
                        height:"30px",
                        minWidth:"30px",
                        minHeight:"30px",
                        backgroundColor: "var(--color-primary)",
                        
                      }}
                    >
                      <File size={16}/>
                    </div>

                    <span className="font-semibold">
                      {project.projectName}
                    </span>
                  </td>

                  <td className="px-8 py-4" >
                    <span>
                      {project.clientName}
                    </span>
                  </td>

                  <td className="px-8 py-4">
                    <span>
                      {project.budget}
                    </span>
                  </td>

                  <td className="px-8 py-4">
                    <div className="flex item gap-4">
                      <Button 
                        variant="ghost"
                        className="px-5 py-2 rounded-md text-white font-semibold bg-[#F00E0E] hover:bg-red-700"
                        style={{
                            color: "white",
                            fontSize: "14px",
                            padding: "2px 6px",
                          }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>


          </table>
      </div>
        {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-6 mt-10 pb-8">
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
    
    </Card>
 
  );
}