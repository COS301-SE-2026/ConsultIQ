import {useState, useEffect, Fragment} from "react";
import { CheckCircle, AlertCircle, RotateCcw} from "lucide-react";

export interface ScoringFactor{
    factorName: string;
    description: string;
    weight: number;
    isActive: boolean;
    hardExclusion: boolean;
}

interface ScoringWeightTableProps{
    initialFactors: ScoringFactor[];
    isProjectOverride?: boolean;
    isUsingDefaultWeights?: boolean;
    onSave: (factor: ScoringFactor[]) => Promise<void>;
    onRevertToDefaultWeights?: () =>void;}

export function ScoringWeightsTable({initialFactors, isProjectOverride, isUsingDefaultWeights, onSave,onRevertToDefaultWeights}: ScoringWeightTableProps){
    const [factors, setFactors]= useState<ScoringFactor[]>(initialFactors);
    const [isSaving, setIsSaving]= useState(false);

    useEffect(() =>{ setFactors(initialFactors);}, [initialFactors]);
    const totalActiveWeight= factors.filter(factor => factor.isActive).reduce((sum, factor) => sum +factor.weight, 0);
    const isValidSum= totalActiveWeight ===100;

    const handleWeightChange=(idx: number, key: keyof ScoringFactor, val: any) =>{
        setFactors(previous => previous.map((factor, i) => i===idx ? {...factor, [key]: val} : factor));
    };

    return(
        <div className="w-full max-w-5xl mx-auto my-12 px-8 py-8 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-10 py-10">
            {isProjectOverride &&(
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold 
                            ${isUsingDefaultWeights ? 'bg-slate-100 text-slate-600' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                <span className={`h-5 w-5 rouned-full ${isUsingDefaultWeights ? 'bg-slate-400' : 'bg-green-500'}`} />
                                {isUsingDefaultWeights? 'Using Consultancy Defaults' : 'Custom Override Active'}
                        </span>
                    </div>
                    {!isUsingDefaultWeights && onRevertToDefaultWeights &&(
                        <button onClick={onRevertToDefaultWeights}
                          className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                            <RotateCcw className="h-5 w-5" />Revert to Defaults
                        </button> )}
                </div>
            )}
            <div className="space-y-6">
                <div className="h-6"/>
                <div className="border-b border-slate-100">
                    <div className="px-6 grid gap-4 md:grid-cols-[2.4fr_2fr_1fr_1fr] items-center text-sm font-bold uppercase tracking-wide">
                        <div>Factor</div>
                        <div className="text-center">Weight</div>
                        <div className="text-center">Active</div>
                        <div className="text-center">Hard Exclusion</div>
                    </div>
                </div>

                { factors.map((factor, idx) =>(
                    <Fragment key={`${factor.factorName}-${idx}`} >
                    <div className={`border border-slate-200 ${!factor.isActive && 'opacity-60'}`}>
                    <div className= "px-6 py-6 grid gap-4 md:grid-cols-[2.4fr_2fr_1fr_1fr] items-center">
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold">{factor.factorName}</h4>
                            <p className="text-sm text-slate-600">{factor.description}</p>
                        </div>
                        
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-sm font-semibold">{factor.weight}</span>
                        </div>
                            <input type="range" min="0" max="100" step="1" 
                            disabled= {!factor.isActive}
                            value={factor.isActive ? factor.weight : 0}
                            onChange={(e) =>handleWeightChange(idx, 'weight', parseInt(e.target.value) || 0)}
                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:cursor-not-allowed"/>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>0%</span>
                            <span>100%</span>
                        </div>
                    </div>
                    <div className="flex justify-center">
                        <input type="checkbox" checked={factor.isActive}
                        onChange={(e) => handleWeightChange(idx, 'isActive', e.target.checked)}
                        className="h-4 w-4 rounded-full accent-blue-600"/>
                    </div>
                    <div className="flex justify-center">
                        <input type="checkbox" disabled={!factor.isActive} checked={factor.hardExclusion}
                        onChange={(e) => handleWeightChange(idx, 'hardExclusion', e.target.checked)}
                        className="h-4 w-4 rounded accent-blue-600"/>
                    </div>
                </div>
            </div>
                    </Fragment>
                    ))}

        </div>
            <div className="mt-6 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className={`flex items-center gap-2 text-sm font-bold px-4 py-3 rounded-lg 
                    ${isValidSum ? 'bg-green-50 text-green-700 border border-green-100': 'bg-red-50 text-red-700 border border-red-100'}`}>
                        {isValidSum ? <CheckCircle className="h-5 w-5"/> : <AlertCircle className="h-5 w-5"/>}
                        Active weights sum up to {totalActiveWeight}% {isValidSum ? '(Valid)' : '(Must equal 100%)'}
                </div>
                <div className="flex gap-3">
                    <button disabled={!isValidSum || isSaving}
                    onClick={()=> {setIsSaving(true); onSave(factors).finally(() =>setIsSaving(false));}}
                    className="h-8 w-25 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm disabled:bg-slate-200 disabled:text-slate-400">
                        {isSaving ? 'Saving...' :'Save Changes'}
                    </button>
                </div>

            </div>
            </div>
        </div>
    );
}