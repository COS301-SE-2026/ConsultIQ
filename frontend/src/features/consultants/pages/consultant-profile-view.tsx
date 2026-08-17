import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import Sidebar from "../../../components/layout/sidebar/sidebar";
import {
  consultantSidebarItems,
  consultantManagerSidebarItems
} from "../../../components/layout/sidebar/sidebar.config";
import { useAuth } from "../../../hooks/useAuth";

import { useFetchConsultantProfile } from "../../../hooks/useFetchConsultantsProfiles";
import { updateConsultantProfile, uploadConsultantPicture } from "../../../api/consultants.api";
import useUnreadNotificationCount from "../../../hooks/useUnreadNotificationsCount";

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
  fullName: string;
  status: "Available" | "Unavailable";
  email: string;
  phone: string;
  idNumber: string;
  nationality: string;
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  skills: Skill[];
  experience: Experience[];
  education: Education[];
}

type UpdatePayload = Parameters<typeof updateConsultantProfile>[1];

function ConsultantProfileViewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const{count: unreadCount} = useUnreadNotificationCount();
  const fromDashboard = location.state?.fromDashboard || false;
  const targetConsultantId = location.state?.selectedConsultantId;

  const { profile: fetchedProfile, isLoading, error, refetch } = useFetchConsultantProfile(
    targetConsultantId,
    user?.userId
  );

 const [overrides, setOverrides] = useState<Partial<Profile>>({});
 const [lastConsultantId, setLastConsultantId] = useState(targetConsultantId);

  if (targetConsultantId !== lastConsultantId) {
    setLastConsultantId(targetConsultantId);
    setOverrides({});
  }

const profile = fetchedProfile ? { ...fetchedProfile, ...overrides } : null;

  const sidebarItems = user?.role === "CONSULTANT_MANAGER"
    ? consultantManagerSidebarItems
    : consultantSidebarItems;

  const canEdit = fromDashboard && Boolean(targetConsultantId);

  async function save(partial: UpdatePayload, optimisticPatch?: Partial<Profile>) {
    if (!targetConsultantId) {
      throw new Error("Missing consultant id");
    }
    await updateConsultantProfile(targetConsultantId, partial);
    setOverrides((prev) => ({...prev,...(optimisticPatch ?? (partial as Partial<Profile>) )}));
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center font-medium" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-primary)" }}>
        Loading profile content...
      </div>
    );
  }

  if (error || !profile) {
    let errorMessage = "profile not found";

    if (error) {
      errorMessage = typeof error === "string" ? error : (error.message || "error while loading profile");
    }

    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4" style={{ backgroundColor: "var(--color-surface)" }}>
        <div className="text-red-500 font-semibold text-lg">{errorMessage || "Profile error"}</div>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={sidebarItems} notificationCount={unreadCount}/>

      <div className="flex-1 flex flex-col overflow-y-auto">
        <header
          className="shrink-0 sticky top-0 z-20 bg-white border-b px-10 h-[90px] flex items-center"
          style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
        >
          <div className="flex items-center gap-6 px-4 w-full">
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
            <h1 className="font-bold text-4xl" style={{ color: "var(--color-primary)", marginLeft: fromDashboard ? "auto" : "0", marginRight: fromDashboard ? "auto" : "0" }}>
              {fromDashboard ? "Consultant Profile" : "My Profile"}
            </h1>
            {fromDashboard && <div style={{ width: "70px" }}></div>}
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center p-10">
          <div className="flex flex-col gap-8 w-full max-w-[1024px]">
            <div className="h-1" />

            <ProfileHeroCard
              fullName={profile.fullName}
              status={profile.status}
              pictureUrl={profile.pictureUrl}
              canEdit={canEdit}
              onSave={async (status, photo) => {
                await save({ availability: status === "Available" ? "AVAILABLE" : "UNAVAILABLE" });
                if(photo && targetConsultantId) {
                  await uploadConsultantPicture(targetConsultantId, photo);
                }
                await refetch();
              }}
            />

            <PersonalInfoCard
              fullName={profile.fullName}
              email={profile.email}
              phone={profile.phone}
              idNumber={profile.idNumber}
              nationality={profile.nationality}
              canEdit={canEdit}
              onSave={async (data) => {
                await save({
                  fullname: data.fullName,
                  email: data.email,
                  phone: data.phone,
                  idNumber: data.idNumber,
                  nationality: data.nationality,
                });
                await refetch();
              }}
            />

           <LocationCard
              addressLine1={profile.addressLine1}
              addressLine2={profile.addressLine2}
              suburb={profile.suburb}
              city={profile.city}
              province={profile.province}
              postalCode={profile.postalCode}
              canEdit={canEdit}
              onSave={async (loc) => {
                await save({
                  addressLine1: loc.addressLine1,
                  addressLine2: loc.addressLine2,
                  suburb: loc.suburb,
                  city: loc.city,
                  province: loc.province,
                  postalCode: loc.postalCode,
                });
                await refetch();
              }}
            />

            <ExperienceCard
              experiences={profile.experience}
              canEdit={canEdit}
              onSave={async (experiences) => {
                await save({
                  experiences: experiences.map((e) => ({
                    jobTitle: e.jobTitle,
                    companyName: e.company,
                    jobType: e.jobType,
                    workModel: e.workModel,
                    startDate: e.startDate,
                    endDate: e.endDate,
                    description: e.roleDescription,
                  })),
                });
                await refetch();
              }}
            />

            <SkillsCard
              skills={profile.skills}
              canEdit={canEdit}
              onSave={async (skills) => {
                const normalized = skills.map((s) => ({
                  ...s,
                  yearsOfExperience: Number(s.yearsOfExperience) || 0,
                }));

                await save({
                  skills: skills.map((s) => ({
                    skillName: s.name,
                    yearsExperience: s.yearsOfExperience,
                    confidenceLevel: s.confidenceLevel,
                  })),
                },
                {skills:normalized}
              );
                await refetch();
              }}
            />

            <EducationCard
              educationList={profile.education}
              canEdit={canEdit}
              onSave={async (education) => {
                await save({
                  education: education.map((e) => ({
                    institution: e.institution,
                    qualification: e.qualification,
                    startDate: e.startDate,
                    endDate: e.endDate || undefined,
                    fileName: e.fileName,
                  })),
                });
                await refetch();
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default ConsultantProfileViewPage;