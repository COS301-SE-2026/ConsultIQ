import { useState } from "react";
import { UserPlus, UserCircle2 } from "lucide-react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { adminSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import ConsultantCard, { type Consultant } from "../components/consultant-card";
import SearchBar from "../../../components/shared/search-bar";


const mockConsultants: Consultant[] = [
  {
    id: "CON123",
    firstName: "Asanda",
    lastName: "Black",
    email: "asandablack@gmail.com",
    phone: "060 292 0109",
    experienceYears: 2,
    ratePerHour: 400,
    skills: ["Java", "React"],
    status: "Available",
  },
  {
    id: "CON456",
    firstName: "Connor",
    lastName: "Sutherland",
    email: "csutherland@gmail.com",
    phone: "060 339 0122",
    experienceYears: 1,
    ratePerHour: 350,
    skills: ["Python", "Django"],
    status: "Available",
  },
  {
    id: "CON789",
    firstName: "Unathi",
    lastName: "Nkosi",
    email: "unathinkosi@gmail.com",
    phone: "060 567 0133",
    experienceYears: 3,
    ratePerHour: 450,
    skills: ["Angular", "TypeScript"],
    status: "Available",
  },
];

function ConsultantsPage() {
  // role must first be determined from context
  const [searchQuery, setSearchQuery] = useState("");

  const available   = mockConsultants.filter((c) => c.status === "Available");
  const unavailable = mockConsultants.filter((c) => c.status === "Unavailable");

  const filtered = mockConsultants.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.skills.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={adminSidebarItems} />

      <div className="flex-1 flex flex-col min-w-0">

        
        <header
          className="bg-white flex items-center justify-between"
          style={{
            height: "90px",
            padding: "0 40px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
       
          <div className="flex items-center gap-4">
            <h1
              className="font-bold"
              style={{ color: "var(--color-primary)", fontSize: "32px" }}
            >
              Consultants
            </h1>

       
            <div
              className="relative bg-white rounded-sm flex items-center cursor-pointer hover:opacity-80 transition"
              style={{
                width: "80px",
                height: "36px",
                outline: "0.8px solid var(--color-border)",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "16px",
                  height: "16px",
                }}
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              <span
                style={{
                  position: "absolute",
                  left: "36px",
                  color: "var(--color-primary)",
                  fontSize: "14px",
                  fontFamily: "var(--font-primary)",
                  lineHeight: "20px",
                }}
              >
                Dark
              </span>
            </div>
          </div>

        
          <div className="flex items-center gap-3">
            <button
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

     
        <main
          className="flex-1 flex flex-col"
          style={{ padding: "40px 48px", gap: "24px" }}
        >
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

          {/* Search bar */}
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search consultants by name, skill, email..."
            onFilterClick={() => console.log("Open filters")}
          />

          {/* Consultants cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((consultant) => (
              <ConsultantCard
                key={consultant.id}
                consultant={consultant}
                onViewDetails={(id) => console.log("View details for", id)}
              />
            ))}
          </div>

       
          {filtered.length > 0 && (
            <p
              className="text-center"
              style={{ color: "var(--color-text-secondary)", fontSize: "16px" }}
            >
              Showing {filtered.length} of {mockConsultants.length} consultants
            </p>
          )}

          {filtered.length === 0 && (
            <p
              className="text-center mt-16"
              style={{ color: "var(--color-text-secondary)", fontSize: "18px" }}
            >
              No consultants match your search.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}

export default ConsultantsPage;