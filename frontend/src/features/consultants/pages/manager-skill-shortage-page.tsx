import SkillShortageTable from "../components/skill-shortage-table";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import {
    consultantManagerSidebarItems
} from "../../../components/layout/sidebar/sidebar.config";
import { useTeamSkillDemand } from "../../../hooks/useTeamSkillDemand";

export default function ManagerSkillShortage() {
    const { data, isLoading, isError, refetch } = useTeamSkillDemand();
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
                            {isError && (
                                <div
                                    role="alert"
                                    className="mb-6 flex items-center justify-between gap-4 rounded-md border border-yellow-300 bg-yellow-50 px-5 py-3 text-sm text-yellow-900"
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

                            {isLoading && !data ? (
                                <div
                                    className="h-64 animate-pulse rounded-lg border border-gray-200 bg-white"
                                    aria-busy="true"
                                    aria-live="polite"
                                >
                                    <span className="sr-only">Loading skill demand</span>
                                </div>
                            ) : data ? (
                                <SkillShortageTable
                                    teamSize={data?.teamSize ?? 0}
                                    skills={data?.skills ?? []}
                                />
                            ) : null}

                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}