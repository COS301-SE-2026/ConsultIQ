import { AlertOctagon, AlertTriangle, Info, RefreshCw, X } from "lucide-react";
import type { Issue } from "../types/scheduler.types";
import { reasonCodeRegistry, type AlertActionKind } from "../utils/reason-code-registry"

interface SchedulerAlerBannerProps {
    readonly issues: Issue[];
    readonly dismissedKeys: Set<string>;
    readonly onDismiss: (key: string) => void;
    readonly onAction: (issue: Issue, action: AlertActionKind) => void;
    readonly showVersionConflict?: boolean;
    readonly onDismissVersionConflict?: () => void;
} 

const ACTION_LABEL: Record<AlertActionKind, string> = {
  dismiss: "Dismiss",
  openBacklog: "Open backlog",
  openDeadlineDialog: "Resolve deadline",
  openSplitDialog: "Split task",
  resolveContainer: "Review allocation",
  viewSuggestions: "View suggestions"
};

function issueKey(issue: Issue): string {
  return `${issue.code}:${issue.entityIds?.join(",") ?? ""}`;
}

function SeverityIcon({ severity } : { severity: Issue["level"]}) {
  if (severity === "violation") return <AlertOctagon size={18} className="text-red-600" />;
  if (severity === "warning") return <AlertTriangle size={18} className="text-amber-600" />;
  return <Info size={18} className="text-blue-600" />;
}

function AlertToast({ issue, onDismiss, onAction,}: {
  readonly issue: Issue;
  readonly onDismiss: () => void;
  readonly onAction: (action: AlertActionKind) => void;
}) {
    
    const entry = reasonCodeRegistry[issue.code];
    const bg =issue.level === "violation" ? "bg-red-50 border-red-200" : issue.level === "warning" ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200";

    return (
        <div className = {`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-sm ${bg}`} >
            <SeverityIcon severity={issue.level} />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{entry.title}</p>
                <p className="mt-0.5 text-sm text-slate-600">{issue.message || entry.message}</p>

                {entry.actions.filter((a) => a !== "dismiss").length > 0 && (
                    <div className="mt-2 flex gap-2">
                        {entry.actions.filter((a) => a !== "dismiss").map((action) => (
                            <button key={action} type="button"
                                onClick={() => onAction(action)}
                                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                {ACTION_LABEL[action]}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button type="button" aria-label="Dismiss alert"
                onClick={onDismiss} 
                className="shrink-0 text-slate-400 hover:text-slate-600"
            >
                <X size={16} />
            </button>
        </div>
    )
}

export default function SchedulerAlertBanner({ issues,   dismissedKeys, onDismiss, onAction, showVersionConflict, onDismissVersionConflict } : SchedulerAlerBannerProps) {
    const visible = issues.filter((issue) => !dismissedKeys.has(issueKey(issue)));

    if(visible.length == 0 && !showVersionConflict) return null;

    return (
        <div className="space-y-2">
            {showVersionConflict && (
                <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
                    <RefreshCw size={18} className="text-blue-600" />
                    <p className="flex-1 text-sm font-medium text-blue-900"> Your schedule changed elsewhere — refreshed. </p>
                
                    <button type="button" aria-label="Dismiss"
                        onClick={onDismissVersionConflict}
                        className="shrink-0 text-blue-400 hover:text-blue-600"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {visible.map((issue) => {
                const key = issueKey(issue);
                return (
                    <AlertToast 
                    key={key}
                    issue={issue}
                    onDismiss={() => onDismiss(key)}
                    onAction={(action) => onAction(issue, action)}
                    />
                );
            })}
        </div>
    )
}