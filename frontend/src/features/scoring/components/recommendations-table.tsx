import { RecommendationRow } from "./recommendation-row";
import type{ Recommendation } from "../types/placements.types";

interface RecommendationTableProps{
    readonly recommendations: Recommendation[];
    readonly onSelectConsultant: (id: string)=> void;
    readonly onViewAll?: ()=> void;
}

export function RecommendationsTable({recommendations, onSelectConsultant, onViewAll}: RecommendationTableProps){
    return(
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 ">
            <h2 className="text-lg font-bold">Top Recommendations</h2>
            <div className="overflow-x-auto py-4">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 text-sm folt-bold">
                            <th className="pb-4 px-6 text-lg text-center w-16"  style={{ color: "var(--color-text-primary)"}}>Rank</th>
                            <th className="pb-4 px-6 text-lg">Consultant</th>
                            <th className="pb-4 px-6 text-lg text-center">Fit Score</th>
                            <th className="pb-4 px-6 text-lg  text-center">Availability</th>
                            <th className="pb-4 px-6 text-lg text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recommendations.map((item) =>(
                            <RecommendationRow
                            key={item.consultantId}
                            recommendation={item}
                            onSelectConsultant={onSelectConsultant}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-6 pt-4 text-center">
                <button type="button" onClick={onViewAll}
                className="text-sm font-semibold text-slate-600 inline-flex items-center gap-1 cursor-pointer">
                    View all Consultants
                </button>
            </div>
        </div>
    )
}