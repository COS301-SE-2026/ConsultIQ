import { useState, useEffect } from "react";
import { UserPlus } from "lucide-react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import ConsultantCard, { type Consultant, type ConsultantStatus } from "../components/consultant-card";
import SearchBar from "../../../components/shared/search-bar";
import { useNavigate } from "react-router-dom";
import { getConsultants, getPendingProfiles } from "../services/consultant.service";
import type { PendingProfileUserDto } from "../services/consultant.service";
import { toast } from "sonner";
import { UserCircle2 } from "lucide-react";

function ConsultantsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfileUserDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSection, setActiveSection] = useState<"active" | "pending">("active");
  const ITEMS_PER_PAGE = 6;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [consultantsResponse, pendingResponse] = await Promise.all([
          getConsultants(1, 50),
          getPendingProfiles(),
        ]);

        const mapped = consultantsResponse.consultants.map((dto) => {
          const parts = dto.fullName.split(" ");
          return {
            id: dto.id,
            firstName: parts[0] || "",
            lastName: parts.slice(1).join(" ") || "",
            email: dto.email,
            phone: dto.phone || "",
            experienceYears: dto.experienceYears || 0,
            ratePerHour: dto.costToCompanyRate || 0,
            skills: dto.primarySkills,
            status: dto.availabilityStatus === "AVAILABLE" ? "Available" : "Unavailable" as ConsultantStatus,          };
        });

        setConsultants(mapped);
        setPendingProfiles(pendingResponse);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load consultants");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const available = consultants.filter((c) => c.status === "Available");
  const unavailable = consultants.filter((c) => c.status !== "Available");

  const filteredConsultants = consultants.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.skills.some((s) => s.toLowerCase().includes(q))
    );
  });

  const filteredPending = pendingProfiles.filter((p) => {
    const q = searchQuery.toLowerCase();
    return !q || p.fullName.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
  });

  const activeList = activeSection === "active" ? filteredConsultants : filteredPending;
  const totalPages = Math.ceil(activeList.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = activeList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={consultantManagerSidebarItems} />

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
          style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
        >
          <h1 className="font-bold" style={{ color: "var(--color-primary)", fontSize: "32px" }}>
            Consultants
          </h1>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/register")}
              className="flex items-center gap-2 rounded-xl font-semibold transition hover:opacity-90"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "white",
                fontSize: "16px",
                padding: "12px 20px",
              }}
            >
              <UserPlus size={20} />
              Register Consultant
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div
            className="max-w-[1600px] mx-auto py-8 w-full"
            style={{ paddingLeft: "80px", paddingRight: "80px" }}
          >
            <div className="h-6" />

            {/* Section tabs */}
            <div className="flex gap-6 mb-8">
              <button
                onClick={() => { setActiveSection("active"); setCurrentPage(1); }}
                className="rounded-4xl font-semibold text-base transition flex items-center gap-3"
                style={{
                  padding: "18px 40px",
                  backgroundColor: activeSection === "active" ? "var(--color-primary)" : "var(--color-surface)",
                  color: activeSection === "active" ? "white" : "var(--color-text-secondary)",
                  border: "2px solid var(--color-border)",
                }}
              >
                <span>Active Consultants</span>
                <span className={activeSection === "active" ? "opacity-90" : "opacity-60"}>({consultants.length})</span>
              </button>

              <button
                onClick={() => { setActiveSection("pending"); setCurrentPage(1); }}
                className="rounded-4xl font-semibold text-base transition flex items-center gap-3"
                style={{
                  padding: "18px 40px",
                  backgroundColor: activeSection === "pending" ? "var(--color-primary)" : "var(--color-surface)",
                  color: activeSection === "pending" ? "white" : "var(--color-text-secondary)",
                  border: "2px solid var(--color-border)",
                }}
              >
                <span>Awaiting Profile</span>
                <span className={activeSection === "pending" ? "opacity-90" : "opacity-60"}>({pendingProfiles.length})</span>
              </button>
            </div>
            <div className="h-6" />


            {/* Availability summary — active section only */}
            {activeSection === "active" && (
              <div className="flex items-center gap-6 mb-6">
                <span className="flex items-center gap-2 font-medium" style={{ color: "var(--color-success)", fontSize: "16px" }}>
                  <span className="rounded-full inline-block" style={{ width: "10px", height: "10px", backgroundColor: "var(--color-success)" }} />
                  Available {available.length}
                </span>
                <span className="flex items-center gap-2 font-medium" style={{ color: "var(--color-text-secondary)", fontSize: "16px" }}>
                  <span className="rounded-full inline-block" style={{ width: "10px", height: "10px", backgroundColor: "var(--color-border)" }} />
                  Unavailable {unavailable.length}
                </span>
              </div>
            )}
            <div className="h-6" />
            

            {/* Search bar */}
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={activeSection === "active" ? "Search by name, skill, email..." : "Search by name or email..."}
            />
            <div className="h-6" />

            {/* Active consultants grid */}
            {activeSection === "active" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {isLoading && (
                  <p className="text-center mt-16 col-span-full" style={{ color: "var(--color-text-secondary)", fontSize: "18px" }}>
                    Loading consultants...
                  </p>
                )}
                {!isLoading && (currentItems as Consultant[]).map((consultant) => (
                  <ConsultantCard
                    key={consultant.id}
                    consultant={consultant}
                    onViewDetails={(id) => console.log("View details for", id)}
                  />
                ))}
                {!isLoading && filteredConsultants.length === 0 && (
                  <p className="text-center mt-16 col-span-full" style={{ color: "var(--color-text-secondary)", fontSize: "18px" }}>
                    No consultants found.
                  </p>
                )}
              </div>
            )}

            {/* Pending profiles list */}
            {activeSection === "pending" && (
              <div className="flex flex-col gap-4">
                {isLoading && (
                  <p className="text-center mt-16" style={{ color: "var(--color-text-secondary)", fontSize: "18px" }}>
                    Loading...
                  </p>
                )}
                {!isLoading && (currentItems as PendingProfileUserDto[]).map((user) => (
                  <div
                    key={user.userId}
                    className="bg-white rounded-xl border flex items-center justify-between"
                    style={{ borderColor: "var(--color-border)", padding: "28px 32px" }}
                  >
                    <div>
                      <p className="font-semibold text-lg" style={{ color: "var(--color-primary)" }}>
                        {user.fullName}
                      </p>
                      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        {user.email}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                        Registered {new Date(user.createdAt).toLocaleDateString("en-ZA")}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/create-profile/${user.userId}`)}
                      className="flex items-center gap-2 rounded-xl font-semibold transition hover:opacity-90"
                      style={{
                        backgroundColor: "var(--color-accent)",
                        color: "white",
                        fontSize: "15px",
                        padding: "10px 20px",
                      }}
                    >
                      <UserCircle2 size={18} />
                      Create Profile
                    </button>
                  </div>
                ))}
                {!isLoading && filteredPending.length === 0 && (
                  <p className="text-center mt-16" style={{ color: "var(--color-text-secondary)", fontSize: "18px" }}>
                    All consultants have profiles.
                  </p>
                )}
              </div>
            )}

            {/* Pagination */}
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
          </div>
        </main>
      </div>
    </div>
  );
}

export default ConsultantsPage;