import { useState } from "react";
import { type Recommendation } from "../types/placements.types";
import { formatFactorName, getAvailabilityDisplay } from "./format-helpers";
import { ChevronDown, ChevronUp } from "lucide-react"


interface RecommendationRowProps {
    readonly recommendation: Recommendation;
    readonly onSelectConsultant: (id: string) => void;
}

export function RecommendationRow({ recommendation, onSelectConsultant }: RecommendationRowProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const availability = getAvailabilityDisplay(recommendation.factorBreakdown);

    return (
        <>
            <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="py-5 px-6 text-center w-16 ">
                    <div className="inline-flex items-center justify-center h-10 w-10 bg-slate-300 font bold text-lg rounded-full ">
                        {recommendation.rank}
                    </div>
                </td>

                <td>
                    <button type="button" onClick={() => onSelectConsultant(recommendation.consultantId)}
                        className="font-bold text-primary text-base cursor-pointer block">
                        {recommendation.consultantName}
                    </button>
                    <span className="text-sm text-slate-600 font-medium mt-0.5 block">
                        {recommendation.consultantEmail}
                    </span>
                </td>

                <td className="py-5 px-6 text-center font-bold text-primary text-base">
                    {Math.round(recommendation.finalScore)} %
                </td>

                <td className="py-5 px-6 text-center">
                    <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-800" >
                        <span className={`h-3 w-3 rounded-full ${availability == "Available" ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {availability}
                    </div>
                </td>

                <td>
                    <button type="button" onClick={() => setIsExpanded(!isExpanded)}
                        className="inline-flex items-center gap 2 px-4 py-2 border-slate-700 rounded-md text-sm font-bold text-slate-800 cursor-pointer">
                        Score Breakdown
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                </td>
            </tr>
            {isExpanded && (
                <tr className="bg-slate-50/70 border-b border-slate-200">
                    <td colSpan={5} className="p-6">
                        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                            <div>
                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                                    Active Factor Distribution and Weights
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {recommendation.factorBreakdown.map((item: any) => {
                                        const factorNameStr = item.factor || item.factorName;
                                        const weightPercentage = Math.round(item.weight * 100);
                                        const rawScorePercent = Math.round(item.rawScore * 100);

                                        return (
                                            <div key={factorNameStr} className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <div className="flex justify-between text-[15px] font-semibold text-slate-800">
                                                    <span>{formatFactorName(factorNameStr)} ({weightPercentage}% Weight) </span>
                                                    <span className="font-mono font-bold text-blue-700">{rawScorePercent}%</span>
                                                </div>
                                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                                    <div className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                                        style={{ width: ` ${rawScorePercent}%` }} />
                                                </div>
                                                <p className="text-[15px] text-slate-500 mt-1 flex- items-start gap-1">
                                                    <span>{item.details}</span>
                                                </p>
                                            </div>
                                        )
                                    })}

                                </div>
                            </div>

                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}