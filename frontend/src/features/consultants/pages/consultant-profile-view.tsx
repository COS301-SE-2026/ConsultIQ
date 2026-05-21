import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import { useAuth } from "../../../hooks/useAuth";

import { useFetchConsultantProfile } from "../../../hooks/useFetchConsultantsProfiles";

import {
  ProfileHeroCard,
  PersonalInfoCard,
  LocationCard,
  SkillsCard,
  ExperienceCard,
  EducationCard,
} from "../components/profile";
import type { Skill, Experience, Education } from "../components/profile";

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  status: "Available" | "Unavailable";
  email: string;
  phone: string;
  idNumber: string;
  nationality: string;
  address1: string;
  address2: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  skills: Skill[];
  experience: Experience[];
  education: Education[];
}

function ConsultantProfileViewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth(); 


  const fromDashboard = location.state?.fromDashboard || false;
  const targetConsultantId = location.state?.selectedConsultantId;


  const { profile, isLoading, error } = useFetchConsultantProfile(
    targetConsultantId,
    user?.userId
  );

  console.log("Loaded profile data:", profile);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center font-medium" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-primary)" }}>
        Loading profile content...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4" style={{ backgroundColor: "var(--color-surface)" }}>
        <div className="text-red-500 font-semibold text-lg">{error || "Profile error"}</div>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition">
          Go Back
        </button>
      </div>
    );
  }


  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={consultantSidebarItems} />

      <div className="flex-1 flex flex-col overflow-y-auto">

        <header
          className="shrink-0 sticky top-0 z-20 bg-white border-b px-10 h-[90px] flex items-center justify-between"
          style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
        >
          <div className="flex items-center gap-6 px-4">
            {fromDashboard && (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 font-semibold transition hover:opacity-70"
                style={{
                  color: "var(--color-primary)",
                  fontSize: "16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <ArrowLeft size={20} /> Back
              </button>
            )}
            <h1 className="font-bold text-4xl mx-auto" style={{ color: "var(--color-primary)" }}>
              {fromDashboard ? "Consultant Profile" : "My Profile"}
            </h1>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center p-10">
          <div className="flex flex-col gap-8 w-full max-w-[1024px]">
            <div className="h-1" />

            <ProfileHeroCard
              firstName={profile.firstName}
              lastName={profile.lastName}
              status={profile.status}
            />

            <PersonalInfoCard
              firstName={profile.firstName}
              lastName={profile.lastName}
              email={profile.email}
              phone={profile.phone}
              idNumber={profile.idNumber}
              nationality={profile.nationality}
            />

            <LocationCard
              address1={profile.address1}
              address2={profile.address2}
              suburb={profile.suburb}
              city={profile.city}
              province={profile.province}
              postalCode={profile.postalCode}
            />

            <ExperienceCard experiences={profile.experience} />

            <SkillsCard skills={profile.skills} />

            <EducationCard educationList={profile.education} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default ConsultantProfileViewPage;