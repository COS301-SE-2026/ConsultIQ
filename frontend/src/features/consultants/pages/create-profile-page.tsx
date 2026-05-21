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
            
            // Combine location details
            const addressLine1 = sessionStorage.getItem("location_addressLine1") || "";
            const suburb = sessionStorage.getItem("location_suburb") || "";
            const city = sessionStorage.getItem("location_city") || "";
            const location = [addressLine1, suburb, city].filter(Boolean).join(", ") || profileData.location || "Johannesburg";

            const payload: CreateConsultantPayload = {
                name,
                surname,
                idNumber,
                phoneNumber,
                email,
                location,
                availability,
                // Retaining fallback mock data if nothing is collected yet during testing
                skills: profileData.skills?.length ? profileData.skills : [{ skillName: "TypeScript", experience: "4", competencyLevel: "EXPERT" }],
                certifications: profileData.certifications?.length ? profileData.certifications : [{ title: "AWS Certified Developer" }]
            };

            await createConsultant(payload);
            sessionStorage.removeItem("consultant_profile_draft");
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