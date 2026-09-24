import { useState } from "react";
import { CheckCircle, AlertCircle, RotateCcw, Info, Loader2 } from "lucide-react";

export interface ScoringFactor {
    factorName: string;
    description: string;
    weight: number;
    isActive: boolean;
    hardExclusion: boolean;
    factorKey: string;
}

interface ScoringWeightTableProps {
    initialFactors: ScoringFactor[];
    isProjectOverride?: boolean;
    isUsingDefaultWeights?: boolean;
    onSave: (factor: ScoringFactor[]) => Promise<void>;
    onRevertToDefaultWeights?: () => void;
    onRunMatch?: () => Promise<void>;
    isMatching?: boolean;
}

function ViewInfo({ label, description }: { readonly label: string; readonly description: string }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative inline-flex items-center"
            onMouseEnter= {() =>setIsOpen(true)}
            onMouseLeave= {() =>setIsOpen(false)}>
            <button type="button" onFocus={() => setIsOpen(true)} onBlur={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label={`What does ${label} mean?`}>
                <Info className="h-4 w-4" />
            </button>

            {isOpen && (
                <div className="absolute left-1/2 bottom-full z-50 mb-4 w-56 -translate-x-1/2 rounded-md bg-white  p-3 text-center text-sm text-slate-700 border border-slate-200 shadow-md">
                    <div className="font-semibold text-slate-700">{label}</div>
                    <div className="mt-1">{description}</div>
                </div>)}
        </div>
    );
}

export function ScoringWeightsTable({ initialFactors, isProjectOverride, isUsingDefaultWeights, onSave, onRevertToDefaultWeights, onRunMatch, isMatching }: ScoringWeightTableProps) {
    const [factors, setFactors] = useState<ScoringFactor[]>(initialFactors ?? []);
    const [isSaving, setIsSaving] = useState(false);

    const totalActiveWeight = factors.filter(factor => factor.isActive).reduce((sum, factor) => sum + factor.weight, 0);
    const isValidSum = totalActiveWeight === 100;

    const handleWeightChange = (idx: number, key: keyof ScoringFactor, val: ScoringFactor[keyof ScoringFactor]) => {
        setFactors(previous => previous.map((factor, i) => i === idx ? { ...factor, [key]: val } : factor));
    };

    return (
        <div className="mx-auto my-6 w-full max-w-5xl overflow-visible rounded-lg border border-slate-200 bg-white px-3 py-4 shadow-sm sm:my-12 sm:px-6 sm:py-6 lg:px-8">
            {isProjectOverride && (
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-white py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-sm font-bold 
                            ${isUsingDefaultWeights ? 'bg-slate-100 text-slate-600' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                            <span className={`h-5 w-5 rounded-full ${isUsingDefaultWeights ? 'bg-slate-400' : 'bg-green-500'}`} />
                            {isUsingDefaultWeights ? 'Using Consultancy Defaults' : 'Custom Override Active'}
                        </span>
                        <button type="button" onClick={onRunMatch} disabled={isMatching}
                            className="h-9 px-4 flex items-center justify-center gap-2 text-sm font-semibold text-white rounded-lg" style={{ backgroundColor: "var(--color-primary)" }}>
                            {isMatching && <Loader2 className="h-5 w-5 animate-spin" />}
                            {isMatching ? "Running..." : "Run Match"}
                        </button>
                    </div>

                    {!isUsingDefaultWeights && onRevertToDefaultWeights && (
                        <button type="button" onClick={onRevertToDefaultWeights}
                            className="flex items-center gap-1 self-start text-sm text-slate-500 font-bold sm:self-auto">
                            <RotateCcw className="h-5 w-5" />Revert to Defaults
                        </button>)}

                </div>
            )}
            <div className="hidden border-b border-slate-100 md:block">
                <div className="grid grid-cols-[0.2fr_2fr_1fr_1fr_1fr_0.2fr] items-center gap-1 py-4 text-sm font-bold tracking-wide text-primary">
                    <div></div>
                    <div className="flex"><h3>Factor</h3></div>
                    <div className="flex justify-center gap-2"><h3>Weight</h3></div>
                    <div className=" flex items-center justify-center gap-2">
                        <span><h3>Active</h3></span>
                        <ViewInfo label="Active" description="When turned on, the algorithm actively uses the selected factor to calculate the overall fit, otherwise it is ignored" />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <span><h3>Hard Exclusion</h3></span>
                        <ViewInfo label="Hard Exclusion" description="If enabled, this factor can block the consultant from being considered." />
                    </div>
                    <div></div>
                </div>
            </div>
            <div className="space-y-6">
                {factors.map((factor, idx) => (
                    <div key={`${factor.factorName}-${idx}`} >
                        <div className={`mb-4 border border-slate-200 rounded shadow-sm ${!factor.isActive && 'opacity-60'}`}>
                            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[0.2fr_2fr_1fr_1fr_1fr_0.2fr] md:items-center md:gap-1 md:p-0 md:py-2">
                                <div className="hidden md:block"></div>
                                <div className="space-y-2 md:space-y-3">
                                    <h4 className="text-base font-semibold text-[#002D62]">{factor.factorName}</h4>
                                    <p className="text-sm text-slate-600">{factor.description}</p>
                                </div>

                                <div className="flex items-center justify-between gap-3 md:block md:space-y-2">
                                    <span className="text-sm font-semibold text-slate-500 md:hidden">Weight</span>
                                    <div className="flex items-center justify-end gap-2 md:justify-center">
                                        <div className="w-full max-w-[75px]">
                                            <input type="number" min="0" max="100" step="1"
                                                disabled={!factor.isActive}
                                                value={factor.isActive ? factor.weight : 0}
                                                onChange={(e) => {
                                                    const nxtValue = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                                    handleWeightChange(idx, 'weight', nxtValue);
                                                }}
                                                className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-700 focus:border-blue-50 disabled:bg-slate-100 disabled:text-slate-400 " />
                                        </div>
                                        <span className="text-lg font-semibold text-slate-500">%</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between md:justify-center">
                                    <span className="text-sm font-semibold text-slate-500 md:hidden">Active</span>
                                    <input type="checkbox" checked={factor.isActive}
                                        onChange={(e) => handleWeightChange(idx, 'isActive', e.target.checked)}
                                        className="h-5 w-5 rounded-full accent-blue-900 md:h-4 md:w-4" />
                                </div>
                                <div className="flex items-center justify-between md:justify-center">
                                    <span className="text-sm font-semibold text-slate-500 md:hidden">Hard Exclusion</span>            
                                    <input type="checkbox" disabled={!factor.isActive} checked={factor.hardExclusion}
                                        onChange={(e) => handleWeightChange(idx, 'hardExclusion', e.target.checked)}
                                        className="h-5 w-5 rounded accent-blue-900 md:h-4 md:w-4" />
                                </div>
                                <div className="hidden md:block"></div>
                            </div>
                        </div>
                    </div>
                ))}</div>
            <div className=" mt-6 flex flex-col items-stretch gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-0">
                <div className="hidden w-6 sm:block" />
                <div className={`flex items-center gap-2 text-sm font-bold px-4 py-3 rounded-lg 
                    ${isValidSum ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {isValidSum ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    Active weights sum up to {totalActiveWeight}% {isValidSum ? '(Valid)' : '(Must equal 100%)'}
                </div>
                <div className="flex gap-3">
                    <button type="button" disabled={!isValidSum || isSaving}
                        onClick={() => { setIsSaving(true); onSave(factors).finally(() => setIsSaving(false)); }}
                        className="h-10 w-full rounded-lg bg-[#002D62] text-sm font-bold text-white shadow-sm disabled:bg-slate-200 disabled:text-slate-400 sm:h-8 sm:w-25">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

            </div>
        </div>
    );
}