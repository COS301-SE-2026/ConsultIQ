import { useState, useEffect } from "react";
import { UserPlus, UserCircle2 } from "lucide-react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import ConsultantCard, { type Consultant, type ConsultantStatus } from "../components/consultant-card";
import SearchBar from "../../../components/shared/search-bar";
import { useNavigate } from "react-router-dom";
import { getConsultants } from "../services/consultant.service";
import { toast } from "sonner";

function ConsultantsPage() {
  // role must first be determined from context
  const [searchQuery, setSearchQuery] = useState("");
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConsultants = async () => {
      try {
        setIsLoading(true);
        const response = await getConsultants(1, 50);
        console.log(response);
        // Map the backend structure to what ConsultantCard expects
        const mapped = response.consultants.map((dto) => {
          const parts = dto.fullName.split(" ");
          return {
            id: dto.id,
            firstName: parts[0] || "",
            lastName: parts.slice(1).join(" ") || "",
            email: dto.email,
            phone: dto.phone || "", 
            experienceYears: dto.experienceYears || 3,
            ratePerHour: dto.costToCompanyRate || 0,
            skills: dto.primarySkills,
            status: dto.availabilityStatus as ConsultantStatus,
          };
        });
        setConsultants(mapped);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load consultants");
      } finally {
        setIsLoading(false);
      }
    };

    fetchConsultants();
  }, []);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const available   = consultants.filter((c) => c.status === "Available");
  const unavailable = consultants.filter((c) => c.status === "Unavailable");

  const filtered = consultants.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.skills.some((s) => s.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentConsultants = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={consultantManagerSidebarItems} />

      <div className="flex-1 flex flex-col min-w-0">

        
        <header
          className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
          style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
        >
       
          <div className="flex items-center gap-4">
            <h1
              className="font-bold"
              style={{ color: "var(--color-primary)", fontSize: "32px" }}
            >
              Consultants
            </h1>

          </div>

        
          <div className="flex items-center gap-3">
            <button
             onClick={() => navigate("/register")}
              className="flex items-center gap-2 rounded-xl font-semibold transition hover:opacity-90"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "white",
                fontSize: "16px",
                fontFamily: "var(--font-primary)",
                padding: "12px 20px",
                border: "none",
              }}
            >
              <UserPlus size={20} />
              Register Consultant
            </button>

            <button
              onClick={() => navigate("/create-profile")}  
              className="flex items-center gap-2 rounded-xl font-semibold transition hover:opacity-90"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "white",
                fontSize: "16px",
                fontFamily: "var(--font-primary)",
                padding: "12px 20px",
                border: "none",
              }}
            >
              <UserCircle2 size={20} />
              New Profile
            </button>
          </div>
        </header>
        <div className="h-6" />
     
        <main className="flex-1 overflow-y-auto"  >        
          <div className="max-w-[1600px] mx-auto py-8 w-full" style={{ paddingLeft: "80px", paddingRight: "80px" }}>
           <div className="h-6" />
         
          {/* availability */}
          <div className="flex items-center gap-6">
            <span
              className="flex items-center gap-2 font-medium"
              style={{ color: "var(--color-success)", fontSize: "16px" }}
            >
              <span
                className="rounded-full inline-block"
                style={{ width: "10px", height: "10px", backgroundColor: "var(--color-success)" }}
              />
              Available {available.length}
            </span>
            <span
              className="flex items-center gap-2 font-medium"
              style={{ color: "var(--color-text-secondary)", fontSize: "16px" }}
            >
              <span
                className="rounded-full inline-block"
                style={{ width: "10px", height: "10px", backgroundColor: "var(--color-border)" }}
              />
              Unavailable {unavailable.length}
            </span>
          </div>
          <div className="h-6" />

          {/* Search bar */}
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search consultants by name, skill, email..."
            onFilterClick={() => console.log("Open filters")}
          />
          <div className="h-6" />

          {/* Consultants cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {currentConsultants.map((consultant) => (
              <ConsultantCard
                key={consultant.id}
                consultant={consultant}
                onViewDetails={(id) => console.log("View details for", id)}
              />
            ))}
            {isLoading && (
              <p className="text-center mt-16 col-span-full" style={{ color: "var(--color-text-secondary)", fontSize: "18px" }}>
                Loading consultants...
              </p>
            )}
          </div>

          {!isLoading && totalPages > 1 && (
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

       
          {!isLoading && filtered.length > 0 && (
            <p
              className="text-center"
              style={{ color: "var(--color-text-secondary)", fontSize: "16px" }}
            >
              Showing {filtered.length} of {consultants.length} consultants
            </p>
          )}

          {!isLoading && filtered.length === 0 && (
            <p
              className="text-center mt-16"
              style={{ color: "var(--color-text-secondary)", fontSize: "18px" }}
            >
              No consultants match your search.
            </p>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default ConsultantsPage;