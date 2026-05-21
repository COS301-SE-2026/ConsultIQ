import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth"
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

interface Profile {
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

const mockProfile: Profile = {
  id: "CON123",
  firstName: "Asanda",
  lastName: "Black",
  status: "Available",
  email: "asandablack@gmail.com",
  phone: "060 292 0109",
  idNumber: "9001015000085",
  nationality: "South African",
  address1: "123 duncan street",
  address2: "Apt 4b",
  suburb: "Hatfield",
  city: "Pretoria",
  province: "Gauteng",
  postalCode: "0028",
  skills: [
    { name: "Java",  competencyLevel: "INTERMEDIATE", yearsOfExperience: 3 },
    { name: "React", competencyLevel: "BEGINNER",     yearsOfExperience: 0.5 },
  ],
  experience: [
    {
      id: "exp1",
      company: "TrendIQ.com",
      jobTitle: "Front-End Developer",
      jobType: "Full-time",
      startDate: "October 2021",
      endDate: "December 2022",
      roleDescription:
        "Designed, developed, and maintained responsive user interfaces using HTML, CSS, and JavaScript frameworks. Collaborated closely with backend developers and UX designers.",
      workModel: "ONSITE",
    },
    {
      id: "exp2",
      company: "BrandStyle",
      jobTitle: "Back-end Developer",
      jobType: "Full-time",
      startDate: "December 2023",
      endDate: "Present",
      roleDescription:
        "Built and maintained RESTful APIs and microservices. Improved database query performance and implemented automated testing pipelines.",
      workModel: "REMOTE",
    },
  ],
  education: [
    {
      id: "edu1",
      institution: "University of Pretoria",
      qualification: "Bsc Computer Science",
      startDate: "February 2017",
      endDate: "December 2020",
     
    },
    {
      id: "edu2",
      institution: "Comptia A+",
      qualification: "Computing Technology Industry Association A+ certification",
      startDate: "December 2023",
      endDate: "December 2023",
    },
  ],
};

function ConsultantProfileViewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth(); // Logged in session user data

  const fromDashboard = location.state?.fromDashboard || false;
  const targetConsultantId = location.state?.selectedConsultantId;

  // Execute hook logic cleanly on a single line
  const { profile, isLoading, error } = useFetchConsultantProfile(targetConsultantId, user?.userId);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center font-medium">Loading profile content...</div>;
  }

  if (error || !profile) {
    return <div className="flex h-screen items-center justify-center text-red-500 font-semibold">{error || "Profile error"}</div>;
  }
  
  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={consultantSidebarItems} />

  
      <div className="flex-1 flex flex-col overflow-y-auto">
       
       
        <header
          className="shrink-0 sticky top-0 z-20 bg-white border-b px-10 h-[90px] flex items-center justify-between"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-6">
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
            <h1 className="font-bold text-4xl" style={{ color: "var(--color-primary)" }}>
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