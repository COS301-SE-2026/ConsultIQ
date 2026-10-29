import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { superAdminSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import { ShieldAlert, FileText, Percent, Clock } from "lucide-react";
import { securityReviewService } from "../services/security-review.service";
import { toast } from "sonner";

function SuperAdminDashboardPage() {
    const navigate = useNavigate();
    const [pendingCount, setPendingCount] = useState(0);
    const [stats, setStats] = useState<{
        totalProcessed: number;
        flagRatePercent: number;
        avgResolutionHours: number | null;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [queue, statsRes] = await Promise.all([
                    securityReviewService.getQueue(),
                    securityReviewService.getDashboardStats(),
                ]);
                setPendingCount(queue.length);
                setStats(statsRes);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Failed to load dashboard");
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
            <Sidebar items={superAdminSidebarItems} />

            <div className="min-w-0 flex-1 flex flex-col min-h-screen overflow-hidden">
                <header
                    className="flex min-h-[90px] shrink-0 flex-wrap items-center justify-between gap-4 border-b bg-white pl-16 pr-4 py-4 sm:px-6 lg:px-10"
                    style={{ borderColor: "var(--color-border)"}}
                >
                    <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl" style={{ color: "var(--color-primary)" }}>
                        Super Admin Dashboard
                    </h1>
                </header>

                <main className="min-h-0 flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-8 lg:px-10" >

                        {/* Stats row */}
                        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 sm:gap-6">
                            <div className="rounded-xl border bg-white p-5 sm:p-6" style={{ borderColor: "var(--color-border)" }}>
                                <div className="flex items-center gap-3 mb-2">
                                    <FileText size={20} color="#155AD5" />
                                    <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                                        CVs Processed
                                    </span>
                                </div>
                                <p className="text-3xl font-bold" style={{ color: "var(--color-primary)" }}>
                                    {isLoading ? "—" : stats?.totalProcessed ?? 0}
                                </p>
                            </div>

                            <div className="rounded-xl border bg-white p-5 sm:p-6rounded-xl border bg-white p-5 sm:p-6" style={{ borderColor: "var(--color-border)" }}>
                                <div className="flex items-center gap-3 mb-2">
                                    <Percent size={20} color="#F68F24" />
                                    <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                                        Flag Rate
                                    </span>
                                </div>
                                <p className="text-3xl font-bold" style={{ color: "var(--color-primary)" }}>
                                    {isLoading ? "—" : `${stats?.flagRatePercent ?? 0}%`}
                                </p>
                            </div>

                            <div className="rounded-xl border bg-white p-5 sm:p-6" style={{ borderColor: "var(--color-border)" }}>
                                <div className="flex items-center gap-3 mb-2">
                                    <Clock size={20} color="#4EAC64" />
                                    <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                                        Avg. Time to Resolve
                                    </span>
                                </div>
                                <p className="text-3xl font-bold" style={{ color: "var(--color-primary)" }}>
                                    {isLoading || stats?.avgResolutionHours == null
                                        ? "—"
                                        : `${stats.avgResolutionHours.toFixed(1)}h`}
                                </p>
                            </div>
                        </div>

                        {/* Action tile */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            <button
                                onClick={() => navigate("/super-admin/security-review")}
                                className="rounded-xl border-2 bg-white p-5 text-left transition hover:shadow-md sm:p-8"
                                style={{ borderColor: pendingCount > 0 ? "#f59e0b" : "var(--color-border)" }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="rounded-lg p-3" style={{ backgroundColor: "#FDF2E2" }}>
                                        <ShieldAlert size={28} color="#F68F24" />
                                    </div>
                                    {!isLoading && pendingCount > 0 && (
                                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500 text-white">
                                            {pendingCount} pending
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-xl font-bold mb-1" style={{ color: "var(--color-primary)" }}>
                                    Security Review
                                </h2>
                                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                                    Review CVs flagged for malicious content during extraction.
                                </p>
                            </button>

                            {/* Future tiles go here as super admin gains more responsibilities */}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default SuperAdminDashboardPage;