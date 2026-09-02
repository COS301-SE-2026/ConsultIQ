import React from "react";
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell} from "recharts";
import { type SkillGapItem } from "../types/skill-gap.types";

interface SkillGapBarChartProps {
    readonly data: SkillGapItem[];
    readonly height?: number;
}

export const SkillGapBarChart: React.FC<SkillGapBarChartProps> = ({ data, height=400}) =>{
    const getSeverityColor = (severity: string) =>{
        switch (severity){
            case "ADEQUATELY_COVERED":
                return "#10b981";
            case "PARTIALLY_COVERED":
                return "#f59e0b";
            case "NOT_COVERED":
                return "#ef4444";
            default:
                return "#6b7280";
        }
    };

    const chartData = data.map((item) => ({
        name: item.skillName,
        Required: item.requiredCount,
        Available: item.availableCount,
        Coverage: item.coveragePercentage,
        severity: item.severity,
    }));

    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5}} >
                <CartesianGrid strokeDasharray ="3 3"/>
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={140} />
                <Tooltip />
                <Legend />
                <Bar dataKey= "Required" fill="#6b7280" radius={[0, 8, 8, 0]} />
                <Bar dataKey= "Available" radius={[0, 8, 8, 0]} >
                    {chartData.map((entry) =>(
                        <Cell key={`cell-${entry.name}`} fill={getSeverityColor(entry.severity)} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};