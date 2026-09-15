import { useState } from "react";
import { RecommendationRow } from "./recommendation-row";
import type{ Recommendation } from "../types/placements.types";

interface RecommendationTableProps{
    readonly recommendations: Recommendation[];
    readonly onSelectConsultant: (id: string)=> void;
    readonly onPlaceConsultant: (consultantId : string) => Promise<void>;
}

const ITEMS_PER_PAGE = 10;

export function RecommendationsTable({recommendations, onSelectConsultant, onPlaceConsultant}: RecommendationTableProps){
    const [ currentPage, setCurrentPage ] = useState(1);

    const orderedRecommendations = [...recommendations].sort((left, right) => left.rank - right.rank);
    const totalPages = Math.ceil(orderedRecommendations.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage -1) * ITEMS_PER_PAGE;
    const pageRecommendations = orderedRecommendations.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
                        {pageRecommendations.map((item) =>(
                            <RecommendationRow
                            key={item.consultantId}
                            recommendation={item}
                            onSelectConsultant={onSelectConsultant}
                            onPlaceConsultant={onPlaceConsultant}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
           
           {totalPages > 1 && (
                <div className="flex justify-center items-center gap-6 mt-2 pt-4 border-t border-gray-400">
                    <button type="button" 
                        onClick={() => setCurrentPage((p) => Math.max(1, p-1))}
                        disabled= {currentPage === 1}
                        className="text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80"
                        style={{ color: "var(--color-primary)" }} 
                        >
                        Previous
                    </button>

                    <span className="text-sm text-primary"> 
                        Page {currentPage}  of {totalPages}
                    </span>

                    <button type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p+1))}
                        disabled={currentPage === totalPages}
                        className="text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80"
                        style={{ color: "var(--color-primary)" }}
                        >
                        Next
                    </button>
                
                </div>
           )}
        </div>
    )
}