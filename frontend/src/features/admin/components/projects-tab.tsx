import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import {File} from "lucide-react";
import { Pagination } from "../../../components/shared/pagination";
import type { AdminProjectItem, ProjectMeta } from "../types/admin.types";
import {archiveProject,unarchiveProject } from "../services/admin.service";
import { toast } from "sonner";
import { useState,useMemo } from "react";


export interface Project {
  id: string;
  projectName: string;
  clientName: string;
  budget: string;
 
}


interface ProjectTabProps {
  readonly searchQuery?: string;
  readonly budgetSort?: "asc" | "desc" | "";
  readonly projects: AdminProjectItem[];
  readonly meta: ProjectMeta | null;
  readonly loading: boolean;
  readonly currentPage: number;
  readonly onPageChange: (page: number) => void;
  readonly refresh: () => void;
  readonly error:string | null;
}


export default function ProjectsTab({searchQuery= "", budgetSort = "",projects,meta,loading,currentPage,onPageChange,error}: ProjectTabProps) {
    const [localProjects,setLocalProjects] = useState<Record<string,AdminProjectItem["status"]>>({});


    const handleArchive = async (projectId: string)=>{
      toast("Are you sure you want to archive this project?",{
            description: "This action cannot be reversed.",
            duration:5000,
            action: {
              label:"Archive",
              onClick: async () =>{
                try {
                  await archiveProject(projectId);
                  setLocalProjects((prev)=> ( {...prev,[projectId]:"ARCHIVED"}));
                  toast.success("Project archived successfully");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message :"Failed to archive project.");
                }
              },
            },
            cancel:{
              label:"Cancel",
              onClick: () => {},
            },
    });
};

     const handleUnarchive = async (projectId: string)=>{
       try {
         await unarchiveProject(projectId);
          setLocalProjects((prev)=> ( {...prev,[projectId]:"OPEN"}));

          toast.success("Project unarchived successfully");
         
       } catch (err) {
         console.error(err  instanceof Error ? err.message: "Failed to archive project") ;
         
       }
    };

    const displayedProjects = useMemo(
      () => projects.map((p) =>
        localProjects[p.id] ? {...p,status: localProjects[p.id] }:p
      ),
      [projects,localProjects]
    );

  let filtered = displayedProjects.filter((p) => {
     const query = searchQuery.toLowerCase();
     return !query || p.projectName.toLowerCase().includes(query) || p.clientName.toLowerCase().includes(query);
  });

  if (budgetSort === "asc") filtered = [...filtered].sort ((a,b) => Number(a.budget) - Number(b.budget));
  if (budgetSort === "desc") filtered = [...filtered].sort ((a,b) => Number(b.budget) - Number(a.budget));


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

         {error && <p className="px-8 text-red-600 text-sm">{error}</p>}

      <div className="w-full overflow-x-auto">
         {loading ? (
        <div className="flex h-screen items-center justify-center font-medium" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-primary)" }}>
          Loading projects...
        </div>
       ):(
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
              {filtered.map((project)=>(
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
                      {/* <Button 
                        variant="ghost"
                        className="px-5 py-2 rounded-md text-white font-semibold bg-[#F00E0E] hover:bg-red-700"
                        style={{
                            color: "white",
                            fontSize: "14px",
                            padding: "2px 6px",
                          }}
                      >
                        Delete
                      </Button> */}

                       {project.status === "ARCHIVED" ? (
                        <Button 
                        onClick={() => handleUnarchive(project.id)}
                          className="px-5 py-2 rounded-md text-white font-semibold bg-[#46B162] hover:bg-emerald-600" 
                          style={{
                            color: "white",
                            fontSize: "14px",
                            padding: "2px 6px",
                          }}
                        >
                          Unarchive
                        </Button>
                      ):(
                        <Button
                          onClick={() => handleArchive(project.id)}
                          className="flex items-center gap-2 rounded-md font-semibold  bg-[#F0780E] transition hover:bg-orange-600"
                          style={{
                            color: "white",
                            fontSize: "14px",
                            padding: "2px 6px",
                          }}
                        >
                          Archive
                        </Button>

                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
       )}
      </div>
         <Pagination
              currentPage={currentPage}
              totalPages={meta?.totalPages ?? 1}
              onPageChange={onPageChange}
          />
    
    </Card>
 
  );
}