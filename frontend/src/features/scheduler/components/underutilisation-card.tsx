import { useState } from "react";
import type { Issue, Suggestion, WeekMetadata } from "../types/scheduler.types";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";


function hours(minutes: number) {
    return (minutes / 60).toFixed(1).replace(/\.0$/, "");
}

export type ActionSuggestion = Exclude<Suggestion, { code: "COPY_SUMMARY" }>;
type CopySummarySuggestion = Extract<Suggestion, { code: "COPY_SUMMARY" }>;

function CapacitySummary({ metadata }: { readonly metadata: WeekMetadata }) {
    const items: [string, number][] = [
        ["Available", metadata.availableMinutes],
        ["Scheduled", metadata.scheduledMinutes],
        ["Buffer", metadata.bufferMinutes],
    ];

    return (
        <div className="flex flex-wrap gap-x-5 text-xs">
            {items.map(([label, minutes]) => (
                <span key={label} className="text-shadow-slate-500">
                    {label} <span className="font-semibold text-slate-800">{hours(minutes)}h</span>
                </span>
            ))}

        </div>
    );
}

interface CopySummaryButtonProps {
    readonly suggestion: CopySummarySuggestion;
    readonly weekStart: string;
    readonly message: string;
}

function CopySummaryButton({ suggestion, weekStart, message }: CopySummaryButtonProps) {

    const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
    const p = suggestion.payload;

    async function copy() {
        const text = [
            `Capacity summary — week starting ${weekStart}`,
            `Available: ${hours(p.availableMinutes)}h`,
            `Allocated: ${hours(p.allocatedMinutes)}h`,
            `Scheduled: ${hours(p.scheduledMinutes)}h`,
            `Buffer: ${hours(p.bufferMinutes)}h`,
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

    const label = { idle: suggestion.label, copied: "Copied \u2713", failed: "Couldn't copy" }[status];

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
    readonly onSuggestion: (s: ActionSuggestion) => void;
    readonly onDismiss: () => void;
}

export default function UnderutilisationCard({ issue, metadata, weekStart, onSuggestion, onDismiss }: UnderutilisationCardProps) {
    const suggestions = issue.suggestions ?? [];
    const actions = suggestions.filter((s): s is ActionSuggestion => s.code !== "COPY_SUMMARY");
    const copy = suggestions.find((s): s is CopySummarySuggestion => s.code === "COPY_SUMMARY");

    return (
        <Card className="p-4 flex flex-col gap-3 " style={{ borderLeft: "4px solid #002D62" }}>
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

            <div className="flex flex-wrap gap-2">
                {actions.map((s) => (
                    <Button key={s.code + s.label} className="px-3 py-2 rounded-lg text-xs" onClick={() => onSuggestion(s)}>
                        {s.label}
                    </Button>
                ))}
                {copy && <CopySummaryButton suggestion={copy} weekStart={weekStart} message={issue.message}/>}
            </div>

        </Card>
    );

}