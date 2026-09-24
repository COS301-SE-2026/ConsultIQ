import { ChevronDown, ChevronUp } from "lucide-react";  
import type { FeasibilityCheckState } from "../hooks/use-feasibility-check";
import type { FeasibilityCompetency, FeasibilityResponseDto } from "../types/feasibility.types";
import FeasibilityResultCard from "./feasibility-result-card";

interface FeasibilityPreviewPanelProps {
    readonly open: boolean;
    readonly onToggle: () => void;
    readonly minimumCompetency: FeasibilityCompetency;
    readonly onMinimumCompetencyChange: (value : FeasibilityCompetency) => void;
    readonly state: FeasibilityCheckState;
    readonly result : FeasibilityResponseDto | null;
    readonly error : string | null;
}

export default function FeasibilityPreviewPanel({
    open, onToggle, minimumCompetency, onMinimumCompetencyChange, state, result, error }: FeasibilityPreviewPanelProps){
        return (
            <section className="w-full rounded border border-slate-300 bg-white shadow-sm">
                <button 
                type="button" 
                onClick={onToggle}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                    <span>
                        <span className="block text-lg font-bold" style={{ color: "var(--color-primary)" }}>
                            Preview Feasibility
                        </span>
                        <span className="block text-sm text-slate-600">
                            Check how the current draft may perform before saving.
                        </span>
                    </span>

                    {open ? (
                        <ChevronUp className="h-5 w-5 shrink-0" />
                    ) : (
                        <ChevronDown className="h-5 w-5 shrink-0" />
                    )}
                </button>

                {open && (
                    <div className="flex flex-col gap-5 border-t px-5 py-5">
                        <div className="flex max-w-sm flex-col gap-2">
                            <label htmlFor="feasibility-minimum-competency"
                            className="text-sm font-semibold text-slate-800"
                            >
                                Minimum competency
                            </label>

                            <select
                            id="feasibility-minimum-competency"
                            value={minimumCompetency}
                            onChange={(event) => onMinimumCompetencyChange(event.target.value as FeasibilityCompetency)}
                            className="h-11 rounded border border-slate-300 px-3 outline-none focus:border-[var(--color-primary)]"
                            >
                                <option value="BEGINNER">Beginner</option>
                                <option value="INTERMEDIATE">Intermediate</option>
                                <option value="EXPERT">Expert</option>
                            </select>
                        </div>

                        <FeasibilityResultCard 
                        state={state}
                        result={result}
                        error={error}
                        />
                    </div>
                )}
            </section>
        );
    }