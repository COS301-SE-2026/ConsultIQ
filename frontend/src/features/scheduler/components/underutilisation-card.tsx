import { useState } from "react";
import { X } from "lucide-react";
import type { Issue, WeekMetadata } from "../types/scheduler.types";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import type { SchedulerSuggestion } from "../services/scheduler.service";

function hours(minutes: number) {
    return (minutes / 60).toFixed(1).replace(/\.0$/, "");
}

// Button label per suggestion code; codes without one (REVIEW_CAPACITY) are information only
const ACTION_LABEL: Record<string, string> = {
    PLACE_UNPLACED: "Place tasks",
    PULL_FORWARD: "Pull forward",
    EXTEND_BLOCK: "Extend block",
};

function CapacitySummary({ metadata }: { readonly metadata: WeekMetadata }) {
    const items: [string, number][] = [
        ["Available", metadata.availableMinutes],
        ["Scheduled", metadata.scheduledMinutes],
        ["Buffer", metadata.bufferMinutes],
    ];

    return (
        <div className="flex flex-wrap gap-x-5 text-xs">
            {items.map(([label, minutes]) => (
                <span key={label} className="text-slate-500">
                    {label} <span className="font-semibold text-slate-800">{hours(minutes)}h</span>
                </span>
            ))}
        </div>
    );
}

interface CopySummaryButtonProps {
    readonly metadata: WeekMetadata;
    readonly weekStart: string;
    readonly message: string;
}

// Works entirely in the browser, so it doesn't need a suggestion from the backend
function CopySummaryButton({ metadata, weekStart, message }: CopySummaryButtonProps) {
    const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

    async function copy() {
        const text = [
            `Capacity summary — week starting ${weekStart}`,
            `Available: ${hours(metadata.availableMinutes)}h`,
            `Allocated: ${hours(metadata.allocatedMinutes)}h`,
            `Scheduled: ${hours(metadata.scheduledMinutes)}h`,
            `Buffer: ${hours(metadata.bufferMinutes)}h`,
            "",
            message,
        ].join("\n");

        try {
            await navigator.clipboard.writeText(text);
            setStatus("copied");
        } catch {
            setStatus("failed");
        }
        setTimeout(() => setStatus("idle"), 2000);
    }

    const label = { idle: "Copy summary", copied: "Copied \u2713", failed: "Couldn't copy" }[status];

    return (
        <Button variant="outline" className="px-3 py-2 rounded-lg text-xs" onClick={copy}>
            {label}
        </Button>
    );
}

export interface UnderutilisationCardProps {
    readonly issue: Issue;
    readonly metadata: WeekMetadata;
    readonly weekStart: string;
    readonly suggestions: SchedulerSuggestion[];
    readonly onSuggestion: (s: SchedulerSuggestion) => void | Promise<void>;
    readonly onDismissSuggestion: (code: string) => void;
    readonly onDismiss: () => void;
}

export default function UnderutilisationCard({
    issue, metadata, weekStart, suggestions, onSuggestion, onDismissSuggestion, onDismiss,
}: UnderutilisationCardProps) {
    return (
        <Card className="p-4 flex flex-col gap-3" style={{ borderLeft: "4px solid #002D62" }}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold" style={{ color: "#002D62" }}>Spare capacity this week</span>
                    <span className="text-sm text-slate-600">{issue.message}</span>
                </div>
                <Button variant="ghost" className="px-2 py-1 text-xs text-slate-500" onClick={onDismiss}>
                    Dismiss
                </Button>
            </div>

            <CapacitySummary metadata={metadata} />

            {/* One row per backend suggestion: what it is, what to do, and a way to hide just this one */}
            <ul className="flex flex-col gap-2">
                {suggestions.map((s) => (
                    <li key={s.code} className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                        <span className="min-w-0 flex-1 text-sm text-slate-700">{s.message}</span>

                        {ACTION_LABEL[s.code] && (
                            <Button className="shrink-0 px-3 py-1.5 rounded-lg text-xs" onClick={() => void onSuggestion(s)}>
                                {ACTION_LABEL[s.code]}
                            </Button>
                        )}

                        <button type="button" aria-label="Hide this suggestion" title="Hide this suggestion"
                            onClick={() => onDismissSuggestion(s.code)}
                            className="shrink-0 text-slate-400 hover:text-slate-600"
                        >
                            <X size={14} />
                        </button>
                    </li>
                ))}
            </ul>

            <div className="flex flex-wrap gap-2">
                <CopySummaryButton metadata={metadata} weekStart={weekStart} message={issue.message} />
            </div>
        </Card>
    );
}