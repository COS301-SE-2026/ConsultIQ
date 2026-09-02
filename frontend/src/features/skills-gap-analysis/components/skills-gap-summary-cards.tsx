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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric) =>(
                <div key={metric.label} className={`p-6 rounded-lg border ${metric.color} ${metric.borderColor}`} >
                    <p className="text-lg font-medium text-gray-600">{metric.label}</p>
                    <p className={`text-3xl font-bold mt-2 ${metric.textColor}`}>
                        {metric.value}
                    </p>
                </div>
            ))}
        </div>
    );
}