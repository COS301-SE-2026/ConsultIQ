import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import ProfileTabs from "../components/tabs/profile-tabs";
import { createConsultant } from "../services/consultant.service";
import type { CreateConsultantPayload } from "../services/consultant.service";
import { toast } from "sonner";
import { ConsultantProfileProvider, useConsultantProfile } from "../pages/consultant-profile.context";

import PersonalTab from "../layouts/personal-tab";
import ExperienceTab from "../layouts/experience-tab";
import SkillsTab from "../layouts/skills-tab";

type Tab = "personal" | "experience" | "skills";

function CreateProfileContent() {
    const [activeTab, setActiveTab] = useState<Tab>("personal");
    const navigate = useNavigate();
    const { profileData } = useConsultantProfile();
    
    const handleSave = async () => {
        try {
            // Gather data saved by the individual form tabs directly from sessionStorage
            const name = sessionStorage.getItem("profile_firstName") || profileData.name || "Jane";
            const surname = sessionStorage.getItem("profile_lastName") || profileData.surname || "Doe";
            const email = sessionStorage.getItem("profile_email") || profileData.email || `jane.doe.${Date.now()}@consultiq.dev`;
            const idNumber = sessionStorage.getItem("profile_idNumber") || profileData.idNumber;
            const phoneNumber = sessionStorage.getItem("profile_phone") || profileData.phoneNumber;
            const isAvailableStr = sessionStorage.getItem("profile_isAvailable");
            const availability = isAvailableStr ? isAvailableStr === "true" : (profileData.availability ?? true);
            const costToCompanyStr = sessionStorage.getItem("profile_costToCompany");
            const costToCompany = costToCompanyStr ? parseFloat(costToCompanyStr) : (profileData.costToCompany ?? 0);
            
            // Combine location details
            const addressLine1 = sessionStorage.getItem("location_addressLine1") || "";
            const suburb = sessionStorage.getItem("location_suburb") || "";
            const city = sessionStorage.getItem("location_city") || "";
            const location = [addressLine1, suburb, city].filter(Boolean).join(", ") || profileData.location || "Johannesburg";

            // Get skills from session storage
            const rawSkills = sessionStorage.getItem("skills_list");
            const parsedSkills = rawSkills ? JSON.parse(rawSkills) : [];
            const actualSkills = parsedSkills.length ? parsedSkills.map((s: any) => ({
                skillName: s.name || s.skillName,
                experience: String(s.yearsOfExperience || s.experience || "0"),
                competencyLevel: (s.competencyLevel || "BEGINNER").toUpperCase(),
            })) : profileData.skills;

            // Get education/certifications from session storage
            const rawCerts = sessionStorage.getItem("education_list") || sessionStorage.getItem("certifications_list");
            const parsedCerts = rawCerts ? JSON.parse(rawCerts) : [];
            const actualCerts = parsedCerts.length ? parsedCerts.map((c: any) => ({
                title: c.qualification || c.title || c.name || "Unknown Qualification",
            })) : profileData.certifications;

            // Get work experiences from session storage
            const rawExperiences = sessionStorage.getItem("experience_list");
            const parsedExperiences = rawExperiences ? JSON.parse(rawExperiences) : [];
            const actualExperiences = parsedExperiences.length ? parsedExperiences.map((e: any) => ({
                jobTitle: e.jobTitle || "",
                companyName: e.companyName || e.company || "",
                jobType: e.jobType || "Full-time",
                workModel: e.workModel || "Onsite",
                startDate: e.startDate || new Date().toISOString(),
                endDate: e.endDate || undefined,
                description: e.description || e.roleDescription || "",
            })) : profileData.experiences;

            const payload: CreateConsultantPayload = {
                name,
                surname,
                idNumber,
                phoneNumber,
                email,
                location,
                availability,
                costToCompany,
                skills: actualSkills?.length ? actualSkills : [{ skillName: "TypeScript", experience: "4", competencyLevel: "EXPERT" }],
                certifications: actualCerts?.length ? actualCerts : [{ title: "AWS Certified Developer" }],
                experiences: actualExperiences
            };

            await createConsultant(payload);
            
            // Clear all form data from sessionStorage
            const keysToRemove = [
                "consultant_profile_draft",
                "profile_firstName",
                "profile_lastName",
                "profile_email",
                "profile_idNumber",
                "profile_phone",
                "profile_isAvailable",
                "profile_costToCompany",
                "profile_nationality",
                "location_addressLine1",
                "location_addressLine2",
                "location_suburb",
                "location_city",
                "location_province",
                "location_postalCode",
                "experience_list",
                "skills_list",
                "education_list",
                "certifications_list"
            ];
            keysToRemove.forEach(key => sessionStorage.removeItem(key));

            toast.success("Consultant profile created successfully!");
            navigate("/consultants-manager");
        } catch (error: any) {
            toast.error(error.message || "Failed to create consultant profile");
        }
    };

    return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
            <Sidebar items={consultantManagerSidebarItems} />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header
                className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full" 
                style={{
                    borderColor: "var(--color-border)",
                    paddingLeft: "80px",
                    paddingRight: "80px",
                }}
                >
                <h1 className="text-4xl font-bold"
                    style={{
                    color: "var(--color-primary)",
                    }}
                >
                    Profiles
                </h1>

                    <div className="flex gap-6">
                        <button 
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center h-12 w-35 text-lg rounded-xl font-semibold transition bg-gray-50 hover:bg-gray-100"
                        style={{
                            color:
                            "var(--color-primary)",
                        }}>
                        <ArrowLeft className="mr-2 " />
                        Back
                        </button>

                        <button 
                        onClick={handleSave}
                        className="h-12 w-35 text-lg rounded-xl text-white font-semibold transition hover:brightness-110"
                        style={{
                            backgroundColor:
                            "var(--color-accent)",
                        }}>
                        Save
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto relative">
                    {/* Sticky Tabs Container - Full Width */}
                    <div className="sticky top-0 pt-8 w-full" style={{ backgroundColor: "var(--color-surface, #ffffff)", zIndex: 9999 }}>
                        <div className="max-w-[1600px] mx-auto w-full" style={{ paddingLeft: "80px", paddingRight: "80px" }}>
                            <div className="h-6" />
                            <ProfileTabs
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                            />
                            <div className="h-6" />
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="max-w-[1600px] mx-auto w-full pb-8 mt-8" style={{ paddingLeft: "80px", paddingRight: "80px" }}>
                        {activeTab === "personal" && <PersonalTab />}
                        {activeTab === "experience" && <ExperienceTab />}
                        {activeTab === "skills" && <SkillsTab />}
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