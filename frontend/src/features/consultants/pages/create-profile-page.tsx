import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import ProfileTabs from "../components/tabs/profile-tabs";
import { createConsultantProfile } from "../services/consultant.service";
import type { CreateConsultantProfilePayload } from "../services/consultant.service";
import { toast } from "sonner";
import { ConsultantProfileProvider, useConsultantProfile } from "../pages/consultant-profile.context";

import PersonalTab from "../layouts/personal-tab";
import ExperienceTab from "../layouts/experience-tab";
import SkillsTab from "../layouts/skills-tab";
import ReviewTab from "../layouts/review-tab";

export type Tab = "personal" | "experience" | "skills" | "review";

function CreateProfileContent() {
  const [activeTab, setActiveTab] = useState<Tab>("personal");
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { profileData, updateProfileData } = useConsultantProfile();

   useEffect(() => {
      if (userId) {
        updateProfileData({ consultantUserId: userId });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [userId]);

  const handleSave = async () => {
    if (!userId) {
      toast.error("No consultant selected.");
      return;
    }

    const addressLine1 = sessionStorage.getItem("location_addressLine1") || "";
    const suburb = sessionStorage.getItem("location_suburb") || "";
    const city = sessionStorage.getItem("location_city") || "";
    const location = [addressLine1, suburb, city].filter(Boolean).join(", ") || profileData.location;

    if (!location) { toast.error("Location is required. Go back to Personal tab."); return; }
    if (!profileData.idNumber) { toast.error("ID number is required. Go back to Personal tab."); return; }
    if (!profileData.phone) { toast.error("Phone number is required. Go back to Personal tab."); return; }
    if (profileData.skills.length === 0) { toast.error("At least one skill is required."); return; }
    if (profileData.experiences.length === 0) { toast.error("At least one experience entry is required."); return; }

    const payload: CreateConsultantProfilePayload = {
      consultantUserId: userId,
      idNumber: profileData.idNumber,
      phone: profileData.phone,
      nationality: profileData.nationality,
      location,
      costToCompany: profileData.costToCompany,
      availability: profileData.availability,
      skills: profileData.skills,
      experiences: profileData.experiences.map((exp) => ({
          jobTitle: exp.jobTitle,
          companyName: exp.companyName,
          jobType: exp.jobType as "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE",
          workModel: exp.workModel as "ONSITE" | "REMOTE" | "HYBRID",
          startDate: exp.startDate,
          description: exp.description,
          ...(exp.endDate ? { endDate: exp.endDate } : {}),
      })),
      certifications: profileData.certifications.length > 0 ? profileData.certifications : undefined,
    };

    setIsSaving(true);
    try {
      await createConsultantProfile(payload);

      const keysToRemove = [
        "consultant_profile_draft", "profile_idNumber", "profile_phone",
        "profile_isAvailable", "profile_costToCompany", "profile_nationality",
        "location_addressLine1", "location_addressLine2", "location_suburb",
        "location_city", "location_province", "location_postalCode",
        "experience_list", "skills_list", "education_list", "certifications_list",
      ];
      keysToRemove.forEach((key) => sessionStorage.removeItem(key));

      toast.success("Consultant profile created successfully!");
      navigate("/consultants-manager");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create consultant profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={consultantManagerSidebarItems} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header
          className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
          style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
        >
          <h1 className="text-4xl font-bold" style={{ color: "var(--color-primary)" }}>
            Create Profile
          </h1>

          <div className="flex gap-6">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center h-12 w-30 px-6 text-lg rounded-xl font-semibold transition bg-gray-50 hover:bg-gray-100"
              style={{ color: "var(--color-primary)" }}
            >
              <ArrowLeft className="mr-2" />
              Back
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative">
          <div
            className="sticky top-0 w-full"
            style={{ backgroundColor: "var(--color-surface, #ffffff)", zIndex: 9999 }}
          >
            <div className="max-w-[1600px] mx-auto w-full" style={{ paddingLeft: "80px", paddingRight: "80px" }}>
              <div className="h-6" />
              <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
              <div className="h-4" />
            </div>
          </div>

          <div className="max-w-[1600px] mx-auto w-full pb-8 mt-6" style={{ paddingLeft: "80px", paddingRight: "80px" }}>
            {activeTab === "personal" && (
              <PersonalTab onComplete={() => setActiveTab("experience")} />
            )}
            {activeTab === "experience" && (
              <ExperienceTab onComplete={() => setActiveTab("skills")} />
            )}
            {activeTab === "skills" && (
              <SkillsTab onComplete={() => setActiveTab("review")} />
            )}
            {activeTab === "review" && (
              <ReviewTab
                onEdit={setActiveTab}
                onSave={handleSave}
                isSaving={isSaving}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function CreateProfilePage() {
  return (
    <ConsultantProfileProvider>
      <CreateProfileContent />
    </ConsultantProfileProvider>
  );
}