import Sidebar from "../../../components/layout/sidebar/sidebar";
import { projectManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";

import ProjectBasicInfoCard from "../components/project-basic-info-card";
import ProjectLocationCard from "../components/project-location-card";
import ProjectSkillsCard from "../components/project-skills-card";

function ProjectSpecificationPage() {
  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      {/* Sidebar */}
      <Sidebar
        items={projectManagerSidebarItems} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header
          className=" shrink-0 sticky top-0 z-20 border-b px-10 h-[90px] flex items-center justify-end relative" 
          style={{
            borderColor:
              "var(--color-border)",
              backgroundColor:
              "var(--color-surface)",
          }}>
          <h1 className="text-4xl font-bold absolute left-1/2 -translate-x-1/2"
            style={{
              color:
                "var(--color-primary)",
            }}>
            New Project
          </h1>

          <div className="flex gap-6">
            <button className=" h-16 w-48 text-lg rounded font-semibold transition bg-gray-50 hover:bg-gray-100"
              style={{
                color:
                  "var(--color-primary)",
              }}>
              Cancel
            </button>

            <button className="h-16 w-48 text-lg rounded text-white font-semibold transition hover:brightness-110"
              style={{
                backgroundColor:
                  "var(--color-accent)",
              }}>
              Save
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 flex flex-col items-center p-10">
          <div className="flex flex-col gap-8 w-full max-w-[1024px]">
            <div className="h-1" />

            {/* Main Info */}
            <ProjectBasicInfoCard />

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ProjectLocationCard />
              <ProjectSkillsCard />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProjectSpecificationPage;