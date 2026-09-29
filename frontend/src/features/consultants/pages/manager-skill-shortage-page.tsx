import SkillShortageTable from "../components/skill-shortage-table";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import {
    consultantManagerSidebarItems
} from "../../../components/layout/sidebar/sidebar.config";
import { fallbackTeamSkillDemand } from "../types/consultant.types";

export default function ManagerSkillShortage() {
    return (
        <div className="flex h-screen overflow-hidden overscroll-none" style={{ backgroundColor: "var(--color-surface)" }}>
            <Sidebar items={consultantManagerSidebarItems} />

            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <header
                    className="shrink-0 z-20 bg-white  border-b min-h-[90px] flex items-center  w-full pl-16 pr-4 sm:px-10"
                    style={{ borderColor: "var(--color-border)" }}
                >
                    <div className="mx-auto w-full max-w-6xl">
                        <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl" style={{ color: "var(--color-primary)" }}>
                            Skill Investment
                        </h1>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-10">
                    <div className="mx-auto w-full max-w-6xl">
                        <p className="text-3xl font-bold text-[#0B2F63]">Where to invest next</p>
                        <p className="mt-2 text-base text-[#6B7280]">
                            Skills your team is short on, ranked by how many projects they leave uncovered.
                        </p>
                         <section className="mt-8">
                        <SkillShortageTable
                            teamSize={fallbackTeamSkillDemand.teamSize}
                            skills={fallbackTeamSkillDemand.skills}
                        />
                    </section>
                    </div>
                </main>
            </div>
        </div>
    );
}