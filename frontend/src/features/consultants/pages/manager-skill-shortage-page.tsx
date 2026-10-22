import SkillShortageTable from "../components/skill-shortage-table";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import {
    consultantManagerSidebarItems
} from "../../../components/layout/sidebar/sidebar.config";
import { useTeamSkillDemand } from "../../../hooks/useTeamSkillDemand";

export default function ManagerSkillShortage() {
    const { data, isLoading, isError, refetch } = useTeamSkillDemand();
    return (
        <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
            <Sidebar items={consultantManagerSidebarItems} />

            <div className="min-w-0 flex-1 flex flex-col min-h-screen overflow-hidden">
                <header
                    className="flex min-h-[90px] shrink-0 flex-wrap items-center justify-between gap-4 border-b bg-white pl-16 pr-4 py-4 sm:px-6 lg:px-10"
                    style={{ borderColor: "var(--color-border)" }}
                >
                    <div className="mx-auto w-full max-w-6xl">
                        <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl" style={{ color: "var(--color-primary)" }}>
                            Skill Investment
                        </h1>
                    </div>
                </header>

                <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-10 sm:py-8">
                    <div className="mx-auto w-full max-w-6xl">
                        <p className="text-xl font-bold text-[#0B2F63] sm:text-3xl">Where to invest next</p>
                        <p className="mt-2 text-sm text-[#6B7280] sm:text-base">
                            Skills your team is short on, ranked by how many projects they leave uncovered.
                        </p>
                        <section className="mt-6 sm:mt-8">
                            {isError && (
                                <div
                                    role="alert"
                                    className="mb-6 flex flex-col items-start gap-3 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
                                >
                                    <span>
                                        {data ? "Couldn't refresh skill demand. Showing the last loaded data." : "Couldn't load skill demand."}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={refetch}
                                        className="rounded border border-yellow-400 px-3 py-1 font-semibold hover:bg-yellow-100"
                                    >
                                        Try again
                                    </button>
                                </div>
                            )}

                            {isLoading && !data && (
                                <div
                                    className="h-64 animate-pulse rounded-lg border border-gray-200 bg-white"
                                    aria-busy="true"
                                    aria-live="polite"
                                >
                                    <span className="sr-only">Loading skill demand</span>
                                </div>
                            )}
                            
                            { data && (
                                <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
                                    <SkillShortageTable
                                        skills={data?.skills ?? []}
                                    />
                                </div>
                            )}

                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}