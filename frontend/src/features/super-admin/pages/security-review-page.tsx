// features/security-review/pages/security-review-page.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { superAdminSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import { ShieldAlert, ShieldCheck, ChevronDown, ChevronUp, Clock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
    type SecurityQueueItem,
    type SecurityHistoryItem,
} from "../types/security-review.types";
import { securityReviewService } from "../services/security-review.service";
import type { CvSecurityFlagType } from "../../cv-parsing/types/cv.types";

const FLAG_TYPE_LABELS: Record<CvSecurityFlagType, string> = {
    INSTRUCTION_OVERRIDE: "Instruction override attempt",
    AUTHORITY_IMPERSONATION: "Authority impersonation",
    DATA_EXFILTRATION_ATTEMPT: "Data exfiltration attempt",
    HIDDEN_OR_OBFUSCATED_TEXT: "Hidden or obfuscated text",
    TOOL_USE_OR_EXTERNAL_REQUEST: "External request attempt",
    SCHEMA_MANIPULATION_ATTEMPT: "Schema manipulation attempt",
    OTHER_SUSPICIOUS_CONTENT: "Other suspicious content",
};

function SecurityReviewPage() {
    const navigate = useNavigate();
    const [queue, setQueue] = useState<SecurityQueueItem[]>([]);
    const [history, setHistory] = useState<SecurityHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [resolvingId, setResolvingId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const [queueRes, historyRes] = await Promise.all([
                    securityReviewService.getQueue(),
                    securityReviewService.getHistory(),
                ]);
                if (cancelled) return;
                setQueue(queueRes);
                setHistory(historyRes);
            } catch (error) {
                if (cancelled) return;
                toast.error(error instanceof Error ? error.message : "Failed to load security review data");
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, []);

    const refreshData = async () => {
        try {
            const [queueRes, historyRes] = await Promise.all([
                securityReviewService.getQueue(),
                securityReviewService.getHistory(),
            ]);
            setQueue(queueRes);
            setHistory(historyRes);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to load security review data");
        }
    };

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const [queueRes, historyRes] = await Promise.all([
                    securityReviewService.getQueue(),
                    securityReviewService.getHistory(),
                ]);
                if (cancelled) return;
                setQueue(queueRes);
                setHistory(historyRes);
            } catch (error) {
                if (cancelled) return;
                toast.error(error instanceof Error ? error.message : "Failed to load security review data");
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleDecision = async (cvFileId: string, decision: "CLEARED" | "REJECTED") => {
        const label = decision === "CLEARED" ? "clear" : "reject";
        const confirmed = window.confirm(
            decision === "REJECTED"
                ? "Reject this CV? This cannot be undone, and the consultant's application cannot be reopened."
                : "Clear this CV for review? The consultant manager will be able to proceed with profile creation."
        );
        if (!confirmed) return;

        try {
            setResolvingId(cvFileId);
            await securityReviewService.resolve(cvFileId, decision);
            toast.success(`CV ${label}ed successfully.`);
            setExpandedId(null);
            await refreshData(); // was: await loadData();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : `Failed to ${label} CV.`);
        } finally {
            setResolvingId(null);
        }
    };

    return (
        <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
            <Sidebar items={superAdminSidebarItems} />

            <div className="flex-1 flex flex-col h-screen overflow-y-auto">
                <header
                    className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
                    style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
                >
                    <h1 className="font-bold" style={{ color: "var(--color-primary)", fontSize: "32px" }}>
                        Security Review
                    </h1>
                </header>

                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-[1200px] mx-auto py-8 w-full" style={{ paddingLeft: "80px", paddingRight: "80px" }}>

                        <div className="flex items-center gap-2 mb-6">
                            <button
                                onClick={() => navigate("/super-admin-dashboard")}
                                className="text-sm font-medium flex items-center gap-1"
                                style={{ color: "var(--color-primary)" }}
                            >
                                <ArrowLeft size={16} /> Back to dashboard
                            </button>
                        </div>

                        {/* The queue */}
                        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-primary)" }}>
                            Awaiting your review
                        </h2>

                        {isLoading && (
                            <p className="text-center mt-16" style={{ color: "var(--color-text-secondary)" }}>
                                Loading...
                            </p>
                        )}

                        {!isLoading && queue.length === 0 && (
                            <div className="bg-white rounded-xl border p-10 text-center" style={{ borderColor: "var(--color-border)" }}>
                                <ShieldCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                <p style={{ color: "var(--color-text-secondary)" }}>Nothing waiting on you right now.</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-4 mb-10">
                            {!isLoading && queue.map((item) => {
                                const isExpanded = expandedId === item.cvFileId;
                                const uniqueFlagTypes = Array.from(new Set(item.securityFlags.map((f) => f.flagType)));
                                const isResolving = resolvingId === item.cvFileId;

                                return (
                                    <div
                                        key={item.cvFileId}
                                        className="bg-white rounded-xl border-2 border-amber-200 overflow-hidden"
                                    >
                                        <button
                                            className="w-full flex items-center justify-between p-6 text-left"
                                            onClick={() => setExpandedId(isExpanded ? null : item.cvFileId)}
                                        >
                                            <div className="flex items-start gap-4">
                                                <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
                                                <div>
                                                    <p className="font-semibold text-lg" style={{ color: "var(--color-primary)" }}>
                                                        {item.consultantName}
                                                    </p>
                                                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                                                        {item.consultantEmail} · CV uploaded {new Date(item.uploadedAt).toLocaleDateString("en-ZA")}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {uniqueFlagTypes.map((flagType) => (
                                                            <span
                                                                key={flagType}
                                                                className="text-xs font-semibold px-2 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200"
                                                            >
                                                                {FLAG_TYPE_LABELS[flagType] ?? "Other suspicious content"}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </button>

                                        {isExpanded && (
                                            <div className="px-6 pb-6 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
                                                <p className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>
                                                    Detected content:
                                                </p>
                                                <div className="flex flex-col gap-2 mb-5">
                                                    {item.securityFlags.map((flag, i) => (
                                                        <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                                            <p className="text-sm font-semibold text-amber-800">
                                                                {FLAG_TYPE_LABELS[flag.flagType] ?? "Other suspicious content"}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-1">Found in: {flag.field}</p>
                                                            <p className="text-sm text-gray-800 mt-2 font-mono break-all">
                                                                {flag.excerpt}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        onClick={() => handleDecision(item.cvFileId, "REJECTED")}
                                                        disabled={isResolving}
                                                        className="px-6 py-2.5 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleDecision(item.cvFileId, "CLEARED")}
                                                        disabled={isResolving}
                                                        className="px-6 py-2.5 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-50"
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Quiet history strip — collapsed by default */}
                        <div className="bg-white rounded-xl border" style={{ borderColor: "var(--color-border)" }}>
                            <button
                                className="w-full flex items-center justify-between p-5"
                                onClick={() => setHistoryOpen((o) => !o)}
                            >
                                <span className="flex items-center gap-2 font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                                    <Clock size={18} />
                                    Recently resolved ({history.length})
                                </span>
                                {historyOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>

                            {historyOpen && (
                                <div className="border-t divide-y" style={{ borderColor: "var(--color-border)" }}>
                                    {history.length === 0 && (
                                        <p className="p-5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                                            No decisions made yet.
                                        </p>
                                    )}
                                    {history.map((h) => (
                                        <div key={h.cvFileId} className="flex items-center justify-between p-4 px-5">
                                            <div>
                                                <p className="text-sm font-medium">{h.consultantName}</p>
                                                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                                    {h.reviewedByName} · {new Date(h.reviewedAt).toLocaleString("en-ZA")}
                                                </p>
                                            </div>
                                            <span
                                                className={`text-xs font-semibold px-2 py-1 rounded-md ${
                                                    h.decision === "CLEARED"
                                                        ? "bg-green-50 text-green-700 border border-green-200"
                                                        : "bg-red-50 text-red-700 border border-red-200"
                                                }`}
                                            >
                                                {h.decision === "CLEARED" ? "Cleared" : "Rejected"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default SecurityReviewPage;