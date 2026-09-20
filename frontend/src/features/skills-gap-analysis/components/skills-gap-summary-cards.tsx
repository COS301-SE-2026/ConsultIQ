import React from "react";
import { type SkillGapSummary } from "../types/skill-gap.types";   

interface SkillGapSummaryCardsProps {
    readonly summary: SkillGapSummary;
}

export const SkillGapSummaryCards: React.FC<SkillGapSummaryCardsProps> =({ summary }) =>{
    const metrics = [
        {
            label: "Overall Coverage",
            value: `${summary.overallCoveragePercent.toFixed(1)}%`,
            color: "bg-blue-50",
            textColor: "text-blue-700",
            borderColor: "border-blue-200",
        },
        {
            label: "Adequately Covered",
            value: `${summary.adequatelyCoveredCount}`,
            color: "bg-green-50",
            textColor: "text-green-700",
            borderColor: "border-green-200",
        },
        {
            label: "At Risk",
            value: `${summary.atRiskCount}`,
            color: "bg-yellow-50",
            textColor: "text-yellow-700",
            borderColor: "border-yellow-200",
        },
        {
            label: "Critical Gaps",
            value: `${summary.criticalCount}`,
            color: "bg-red-50",
            textColor: "text-red-700",
            borderColor: "border-red-200",
        },
    ];

    return(
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {metrics.map((metric) =>(
                <div key={metric.label} className={`min-w-0 rounded-lg border p-4 sm:p-5 ${metric.color} ${metric.borderColor}`} >
                    <p className="break-words text-base font-medium text-gray-600 sm:text-lg">{metric.label}</p>
                    <p className={`mt-2 text-2xl font-bold sm:text-3xl ${metric.textColor}`}>
                        {metric.value}
                    </p>
                </div>
            ))}
        </div>
    );
}