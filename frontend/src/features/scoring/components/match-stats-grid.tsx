import CountCard from "../../admin/components/count-card";
import { Settings2, Users, UserCheck, UserX, Info } from "lucide-react";
import { useState } from "react";
import type { ScoringFactor } from "./scoring-weights-table";

interface MatchStatsGridProps {
    readonly scoringBasis: 'Override' | 'Default';
    readonly scoringFactors?: ScoringFactor[];
    readonly totalEvaluated: number;
    readonly matched: number;
    readonly excluded: number;
}

export function MatchStatsGrid({ scoringBasis, scoringFactors = [],  totalEvaluated, matched, excluded }: MatchStatsGridProps) {
   const [showFactors, setShowFactors] = useState(false);
   
    const statsConfig = [
        {
            title: 'Total Evaluated',
            count: totalEvaluated,
            icon: Users,
            iconBackgroundColour: '#ecfdf5',
            iconColor: '#059669',
        },
        {
            title: 'Placements',
            count: matched,
            icon: UserCheck,
            iconBackgroundColour: '#f0f9ff',
            iconColor: '#0284c7',
        },
        {
            title: 'Excluded',
            count: excluded,
            icon: UserX,
            iconBackgroundColour: '#fff1f2',
            iconColor: '#e11d48',
        },
    ];

    return (
        <div className="flex flex-wrap  max-w-[1600px] mx-auto w-full pb-8 mt-6 gap-4">
            <div className="relative min-w-0 flex-1" style={{ minWidth: "240px" }}
                onMouseEnter={() => setShowFactors(true)}
                onMouseLeave={() => setShowFactors(false)}
            >
                <button type="button" 
                    onClick={() => setShowFactors((open) => !open)}
                    className= "block w-full text-left"
                    aria-expanded={showFactors}
                    aria-label="Show scoring configuration used for this project"
                >
                    <CountCard
                        title= 'Scoring Basis'
                        count= {scoringBasis}
                        icon= {Settings2}
                        iconBackgroundColour= '#eff6ff'
                        iconColor= '#2563eb'
                    />

                </button>

                {showFactors && (
                    <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-lg">
                        <div className="mb-2 flex items-center gap-2 font-bold text-slate-700">
                            <Info clasName= " h-4 w-4 text-blue-600"/>
                            { scoringBasis === "Override" ?  "Project Override Configuration" : "Consultancy Default Configuration" }
                        </div>
                        {scoringFactors.length === 0 ? (
                            <p className="text-slate-500">No scoring configuration found for this project.</p>
                        ) : (
                            <ul className= "space-y-1.5">
                                {scoringFactors.map((factor) => (
                                    <li key={factor.factorKey} className= "flex items-center justify-between gap-2">
                                        <span className= {factor.isActive ? "text-slate-700" : "text-slate-400 line-through"}>
                                            {factor.factorName}
                                        </span>
                                        <span className= "font-semibold text-slate-800">
                                            {factor.isActive ? `${factor.weight}%` : "Inactive"}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
            
            {statsConfig.map((stat, idx) => (
                <CountCard
                    key={idx}
                    title={stat.title}
                    count={stat.count}
                    icon={stat.icon}
                    iconBackgroundColour={stat.iconBackgroundColour}
                    iconColour={stat.iconColor}
                />
            ))}
        </div>

    )
}