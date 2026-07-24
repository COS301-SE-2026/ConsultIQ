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
        <div className="w-full max-w-5xl mx-auto my-12 px-4 sm:px-6 lg:px-8 py-6 bg-white border border-slate-200 rounded-lg shadow-sm overflow-visible">
            {isProjectOverride && (
                <div className="px-6 py-4 sm:px-4 bg-white border-b border-slate-200 flex justify-between items-center">
                    <div className="px-4 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-sm font-bold 
                            ${isUsingDefaultWeights ? 'bg-slate-100 text-slate-600' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                            <span className={`h-5 w-5 rounded-full ${isUsingDefaultWeights ? 'bg-slate-400' : 'bg-green-500'}`} />
                            {isUsingDefaultWeights ? 'Using Consultancy Defaults' : 'Custom Override Active'}
                        </span>
                        <button onClick={onRunMatch} disabled={isMatching}
                            className="h-9 px-4 flex items-center justify-center gap-2 text-sm font-semibold text-white rounded-lg" style={{ backgroundColor: "var(--color-primary)" }}>
                            {isMatching && <Loader2 className="h-5 w-5 animate-spin" />}
                            {isMatching ? "Running..." : "Run Match"}
                        </button>
                    </div>

                    {!isUsingDefaultWeights && onRevertToDefaultWeights && (
                        <button onClick={onRevertToDefaultWeights}
                            className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                            <RotateCcw className="h-5 w-5" />Revert to Defaults
                        </button>)}

                </div>
            )}
            <div className="border-b border-slate-100">
                <div className="py-4 grid gap-1 md:grid-cols-[0.2fr_2fr_1fr_1fr_1fr_0.2fr] items-center text-sm font-bold text-primary tracking-wide">
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
                            <div className="py-2 grid gap-1 md:grid-cols-[0.2fr_2fr_1fr_1fr_1fr_0.2fr] items-center">
                                <div></div>
                                <div className="space-y-3">
                                    <h4 className="text-base font-semibold text-[#002D62]">{factor.factorName}</h4>
                                    <p className="text-sm text-slate-600">{factor.description}</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-center">
                                        <div className="max-w-[75px] w-full ">
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
                                <div className="flex justify-center">
                                    <input type="checkbox" checked={factor.isActive}
                                        onChange={(e) => handleWeightChange(idx, 'isActive', e.target.checked)}
                                        className="h-4 w-4 rounded-full accent-blue-900" />
                                </div>
                                <div className="flex justify-center">
                                    <input type="checkbox" disabled={!factor.isActive} checked={factor.hardExclusion}
                                        onChange={(e) => handleWeightChange(idx, 'hardExclusion', e.target.checked)}
                                        className="h-4 w-4 rounded accent-blue-900" />
                                </div>
                                <div></div>
                            </div>
                        </div>
                    </div>
                ))}</div>
            <div className=" h-14 mt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="w-6" />
                <div className={`h-8 flex items-center gap-2 text-sm font-bold px-4 py-3 rounded-lg 
                    ${isValidSum ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {isValidSum ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    Active weights sum up to {totalActiveWeight}% {isValidSum ? '(Valid)' : '(Must equal 100%)'}
                </div>
                <div className="flex gap-3">
                    <button disabled={!isValidSum || isSaving}
                        onClick={() => { setIsSaving(true); onSave(factors).finally(() => setIsSaving(false)); }}
                        className="h-8 w-25 bg-[#002D62] text-white rounded-lg text-sm font-bold shadow-sm disabled:bg-slate-200 disabled:text-slate-400">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

            </div>
        </div>
    );
}