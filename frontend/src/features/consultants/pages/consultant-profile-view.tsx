import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
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
      location: "415 Lynwood street, Hatfield, Pretoria, 0028",
      jobType: "Full-time",
      startDate: "October 2021",
      endDate: "December 2022",
      duration: "1 year 2 months",
      roleDescription:
        "Designed, developed, and maintained responsive user interfaces using HTML, CSS, and JavaScript frameworks. Collaborated closely with backend developers and UX designers.",
    },
    {
      id: "exp2",
      company: "BrandStyle",
      jobTitle: "Back-end Developer",
      location: "Sandton, Johannesburg",
      jobType: "Full-time",
      startDate: "December 2023",
      endDate: "Present",
      duration: "1 year",
      roleDescription:
        "Built and maintained RESTful APIs and microservices. Improved database query performance and implemented automated testing pipelines.",
    },
  ],
  education: [
    {
      id: "edu1",
      institution: "University of Pretoria",
      qualification: "Bsc Computer Science",
      startDate: "February 2017",
      endDate: "December 2020",
      attachmentName: "Certificate.pdf",
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
 
  const profile = mockProfile;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>

   
      <Sidebar items={consultantSidebarItems} />

      <div className="flex-1 flex flex-col px-2 sm:px-4 min-w-0">

       
        <header
          className="bg-white flex items-center h-[90px] px-10 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h1 className="font-bold text-4xl" style={{ color: "var(--color-primary)" }}>
            My Profile
          </h1>
        </header>

      
        <main className="flex-1 flex flex-col gap-6 px-12 py-10">
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
        </main>

      </div>
    </div>
  );
}

export default ConsultantProfileViewPage;