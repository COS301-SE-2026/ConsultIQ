import React from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { type SkillGapItem } from "../types/skill-gap.types";

interface SkillGapRadarChartProps {
    readonly data: SkillGapItem[];
    readonly height?: number;
}

export const SkillGapRadarChartProps : React.FC<SkillGapRadarChartProps> =({data, height = 400}) =>{
    //only top 10 skills, to avoid cluttering
    const radarData = data.slice(0, 10).map((item) => ({
        name: item.skillName,
        coverage: Math.min(item.coveragePercentage, 100),
    }));

    return (
        <ResponsiveContainer width="100%" height={height}>
            <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar 
                    name="Coverage %"
                    dataKey="coverage"
                    stroke="#3b82f6" 
                    fill="#3b82f6"
                    fillOpacity={0.6}
                />
                <Tooltip formatter={(value) => value!==undefined ? `${Number(value).toFixed(1)}%` : "N/A"}/>
                <Legend />
            </RadarChart>
        </ResponsiveContainer>
    );
};