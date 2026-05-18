import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { projectManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";

import SearchBar from "../../../components/shared/search-bar";

import ProjectFilters from "../components/project-filters";
import ProjectGrid from "../components/project-grid";
import ProjectDetailsModal from "../components/project-details-modal";
import EmptyProjectState from "../components/empty-project-state";

import type { Project } from "../types/project.types";

const mockProjects: readonly Project[] = [
  {
    id: 1,
    name: "Retail Analytics Dashboard",
    clientName: "Shoprite",
    description:
      "Develop a responsive web-based dashboard for retail analytics and inventory tracking.",
    teamSize: 6,
    allocation: 80,
    budget: 30000,
    startDate: "2026-05-20",
    endDate: "2026-09-10",

    location: {
      addressLine1: "12 Rivonia Road",
      addressLine2: "Sandton Office Park",
      suburb: "Sandton",
      city: "Johannesburg",
      province: "Gauteng",
      postalCode: "2196",
    },

    skills: [
      {
        id: 1,
        name: "React",
        competency: "Intermediate",
        years: 3,
        mandatory: true,
      },
      {
        id: 2,
        name: "TypeScript",
        competency: "Intermediate",
        years: 2,
        mandatory: true,
      },
    ],
  },

  {
    id: 2,
    name: "Mobile Banking App Enhancement",
    clientName: "FNB",
    description:
      "Upgrade banking features with biometric login and push notifications.",

    teamSize: 10,
    allocation: 100,
    budget: 100000,
    startDate: "2026-06-01",
    endDate: "2026-12-20",

    location: {
      addressLine1: "1 Banker Street",
      addressLine2: "",
      suburb: "Rosebank",
      city: "Johannesburg",
      province: "Gauteng",
      postalCode: "2196",
    },

    skills: [
      {
        id: 3,
        name: "Flutter",
        competency: "Advanced",
        years: 4,
        mandatory: true,
      },
    ],
  },
  {
    id: 3,
    name: "AI-Powered Recruitment Platform",
    clientName: "ConsultIQ",
    description:
      "Develop an AI platform to match consultants to projects based on skills and experience.",

    teamSize: 8,
    allocation: 70,
    budget: 500000,
    startDate: "2026-07-15",
    endDate: "2027-01-15",

    location: {
      addressLine1: "99 Oxford Road",
      addressLine2: "",
      suburb: "Melrose",
      city: "Johannesburg",
      province: "Gauteng",
      postalCode: "2196",
    },

    skills: [
      {
        id: 4,
        name: "Python",
        competency: "Advanced",
        years: 5,
        mandatory: true,
      },
    ],
  },
  {
    id: 4,
    name: "E-commerce Website Redesign",
    clientName: "Takealot",
    description:
      "Redesign the e-commerce website for improved user experience and mobile responsiveness.",

    teamSize: 5,
    allocation: 60,
    budget: 75000,
    startDate: "2026-08-01",
    endDate: "2026-11-30",

    location: {
      addressLine1: "88 Main Street",
      addressLine2: "",
      suburb: "Cape Town City Centre",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "8000",
    },

    skills: [
      {
        id: 5,
        name: "Vue.js",
        competency: "Intermediate",
        years: 3,
        mandatory: true,
      },
    ], 
  },
  {
    id: 5,
    name: "Cloud Migration Project",
    clientName: "Standard Bank",
    description:
      "Migrate on-premises applications to AWS cloud infrastructure for improved scalability.",

    teamSize: 12,
    allocation: 90,
    budget: 200000,
    startDate: "2026-09-01",
    endDate: "2027-03-31",

    location: {
      addressLine1: "50 Main Street",
      addressLine2: "",
      suburb: "Johannesburg City Centre",
      city: "Johannesburg",
      province: "Gauteng",
      postalCode: "2000",
    },

    skills: [
      {
        id: 6,
        name: "AWS",
        competency: "Advanced",
        years: 4,
        mandatory: true,
      },
    ],
  },
  {
    id: 6,
    name: "Data Warehouse Implementation",
    clientName: "Woolworths",
    description:
      "Implement a data warehouse solution for centralized reporting and analytics.",

    teamSize: 7,
    allocation: 75,
    budget: 120000,
    startDate: "2026-10-01",
    endDate: "2027-02-28",

    location: {
      addressLine1: "77 Long Street",
      addressLine2: "",
      suburb: "Cape Town City Centre",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "8000",
    },

    skills: [
      {
        id: 7,
        name: "SQL",
        competency: "Advanced",
        years: 5,
        mandatory: true,
      },
    ],  
  }, 
  {
    id: 7,
    name: "Cybersecurity Assessment",
    clientName: "Discovery",
    description:
      "Conduct a comprehensive cybersecurity assessment and provide recommendations for improvement.",

    teamSize: 4,
    allocation: 50,
    budget: 40000,
    startDate: "2026-11-01",
    endDate: "2026-12-31",

    location: {
      addressLine1: "33 Oxford Road",
      addressLine2: "",
      suburb: "Rosebank",
      city: "Johannesburg",
      province: "Gauteng",
      postalCode: "2196",
    },

    skills: [
      {
        id: 8,
        name: "Cybersecurity",
        competency: "Advanced",
        years: 5,
        mandatory: true,
      },
    ],
  }

];

export default function ProjectListPage() {
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [budgetFilter, setBudgetFilter] = useState("");
  const [teamSizeFilter, setTeamSizeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const filteredProjects = useMemo(() => {
    return mockProjects.filter((project) => {
        const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase()) ||
        project.clientName.toLowerCase().includes(search.toLowerCase());

        let matchesBudget = true;

        if (budgetFilter === "small") {
            matchesBudget =
            project.budget < 50000;
        }

        if (budgetFilter === "medium") {
        matchesBudget =
            project.budget >= 50000 &&
            project.budget <= 200000;
        }

        if (budgetFilter === "large") {
        matchesBudget =
            project.budget > 200000;
        }

        if(budgetFilter === "all") {
          matchesBudget = true;
        }

        let matchesTeamSize = true;

        if (teamSizeFilter === "small") {
        matchesTeamSize =
            project.teamSize <= 5;
        }

        if (teamSizeFilter === "medium") {
        matchesTeamSize =
            project.teamSize >= 6 &&
            project.teamSize <= 10;
        }

        if (teamSizeFilter === "large") {
        matchesTeamSize =
            project.teamSize > 10;
        }

        if(teamSizeFilter === "all") {
          matchesTeamSize = true;
        }

        let matchesLocation = true;

        if (locationFilter) {
        matchesLocation =
            project.location.province
            .toLowerCase()
            .replace(/\s/g, "-") ===
            locationFilter;
        }

        if(locationFilter === "all") {
          matchesLocation = true;
        }

        return (
        matchesSearch &&
        matchesBudget &&
        matchesTeamSize &&
        matchesLocation
        );
    });
    }, [
    search,
    budgetFilter,
    teamSizeFilter,
    locationFilter,
    ]);

  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      {/* Sidebar */}
      <Sidebar items={projectManagerSidebarItems} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header
          className="shrink-0 z-20 border-b h-[90px] flex items-center justify-between w-full" 
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-surface)",
            paddingLeft: "80px",
            paddingRight: "80px",
          }}
        >
          <h1 className="text-4xl font-bold"
            style={{
              color: "var(--color-primary)",
            }}
          >
            Projects
          </h1>

          <div className="flex gap-6">
            <button
              onClick={() => navigate("/project-specification")}
              className="h-16 w-48 flex items-center justify-center gap-2 text-lg rounded text-white font-semibold transition hover:brightness-110"
              style={{
                backgroundColor: "var(--color-accent)",
              }}
            >
              <Plus className="h-5 w-5 strokeWidth={3}" />
              Project
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto py-8 w-full" style={{ paddingLeft: "80px", paddingRight: "80px" }}>

          {/* Search */}
          <div className="mt-8">
            <div className="h-6" />
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search projects..."
              onFilterClick={() => setShowFilters((prev) => !prev)}
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-6">
              <div className="h-6" />
              <ProjectFilters
                budgetFilter={budgetFilter}
                teamSizeFilter={teamSizeFilter}
                locationFilter={locationFilter}
                onBudgetChange={setBudgetFilter}
                onTeamSizeChange={setTeamSizeFilter}
                onLocationChange={setLocationFilter}
              />
            </div>
          )}

          {/* Projects */}
          <div className="mt-10">
            <div className="h-6" />
            {filteredProjects.length > 0 ? (
              <ProjectGrid
                projects={filteredProjects}
                onViewDetails={setSelectedProject}
              />
            ) : (
              <EmptyProjectState />
            )}
          </div>
          </div>
        </main>
      </div>

      {/* Details Modal */}
      <ProjectDetailsModal
        open={!!selectedProject}
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </div>
  );
}