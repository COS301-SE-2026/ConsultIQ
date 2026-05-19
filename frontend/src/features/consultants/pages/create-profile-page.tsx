import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import ProfileTabs from "../components/tabs/profile-tabs";

import PersonalTab from "../layouts/personal-tab";
import ExperienceTab from "../layouts/experience-tab";
import SkillsTab from "../layouts/skills-tab";

type Tab = "personal" | "experience" | "skills";

export default function CreateProfilePage() {
    const [activeTab, setActiveTab] = useState<Tab>("personal");
    const navigate = useNavigate();
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
                        onClick={() => navigate("/consultants-manager")}
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