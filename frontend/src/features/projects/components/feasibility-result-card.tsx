import { AlertCircle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import type { FeasibilityResponseDto, FeasibilityValue } from "../types/feasibility.types";
import type { FeasibilityCheckState } from "../hooks/use-feasibility-check";    

interface FeasibilityResultCardProps {
    readonly state: FeasibilityCheckState;
    readonly result: FeasibilityResponseDto | null;
    readonly error: string | null;
}

function formatValue(value: FeasibilityValue | null): string {
    if(value === null) return "Unavailable";

    if(typeof value === "number") return value.toString();

    if(value.min === value.max){
        return value.min.toLocaleString()
    }

    return `${value.min.toLocaleString()}–${value.max.toLocaleString()}`;
}

export  default function FeasibilityResultCard({state, result, error} : FeasibilityResultCardProps){
    if(state === "idle"){
        return(
            <p className="text-sm text-slate-600">
                Adjust the project requirements to preview consultant feasibility.
            </p>
        );
    }
    
    if(state === "loading"){
        return(
            <div className="flex items-center gap-3 text-sm text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                Checking current consultant availability...
            </div>
        );
    }

    if(state === "forbidden"){
        return(
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{error ?? "This preview is not available for your account."} </p>
            </div>
        );
    }

    if(state === "rate-limited"){
        return(
            <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{error ?? "Please slow down a little before trying again."} </p>
            </div>
        );
    }

    if(state === "error"){
        return(
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{error ?? "Unable to check feasibility right now."} </p>
            </div>
        );
    }

    if(!result) return null;

    return(
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <div className="mb-1 flex items-center gap-2 text-sm font-medium text-emerald-800">
                        <CheckCircle2 className="h-4 w-4" />
                        Eligible consultants
                    </div>
                    <p className="text-2xl font-bold text-emerald-950">{formatValue(result.base.eligibleCount)}</p>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="mb-1 text-sm font-medium text-blue-800">Top match score</p>
                    <p className="text-2xl font-bold text-blue-950">{formatValue(result.base.topScore)}</p>
                </div>
            </div>

            {result.variants.length > 0 &&(
                <div className="border-t border-slate-200 pt-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-800">Relaxed scenarios</h3>

                    <div className="flex flex-col gap-2">
                        {result.variants.map((variant) => (
                            <div key={variant.label} className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <span className="text-sm text-slate-700">{variant.label}</span>
                                <span className="text-sm font-semibold text-slate-950">
                                    {formatValue(variant.result.eligibleCount)} eligible
                                    <span className="ml-2 font-normal text-slate-500">
                                      · top score {formatValue(variant.result.topScore)}  
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}