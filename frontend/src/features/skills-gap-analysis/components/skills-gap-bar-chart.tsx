import React , { useEffect, useState } from "react";
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell} from "recharts";
import { Maximize2, X } from "lucide-react";
import { type SkillGapItem } from "../types/skill-gap.types";

interface SkillGapBarChartProps {
    readonly data: SkillGapItem[];
    readonly height?: number;
}

export const SkillGapBarChart: React.FC<SkillGapBarChartProps> = ({ data, height=300}) =>{
    const [isExpanded, setIsExpanded] = useState(false);

    const getSeverityColor = (severity: string) =>{
        switch (severity){
            case "COVERED":
                return "#10b981";
            case "AT_RISK":
                return "#f59e0b";
            case "CRITICAL":
                return "#ef4444";
            default:
                return "#6b7280";
        }
    };

    const chartData = data.map((item) => ({
        name: item.skillName,
        Required: item.requiredCount,
        Available: item.availableCount,
        Coverage: item.coveragePercent,
        severity: item.severity,
    }));

    const chartHeight = Math.max(height, data.length * 25);

    useEffect(() =>{
        if(!isExpanded){
            return;
        }

        const closeOnEscape = (event: KeyboardEvent) =>{
            if(event.key === "Escape"){
                setIsExpanded(false);
            }
        };

        document.addEventListener("keydown", closeOnEscape);

        return () =>{
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [isExpanded]);

    const renderChart = (renderedHeight: number | `${number}%`) => (
        <ResponsiveContainer width="100%" height={renderedHeight}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5}}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey= "Required" fill="#002D62" radius={[0, 8, 8, 0]} />
                <Bar dataKey= "Available" radius={[0, 8, 8, 0]} >
                    {chartData.map((entry) =>(
                        <Cell key={`cell-${entry.name}`} fill={getSeverityColor(entry.severity)} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );

    const renderLegend = () => (
        <table className="mx-auto mt-3 border-collapse text-sm text-gray-700">
            <thead>
                <tr>
                    <th className="border border-gray-200 bg-gray-50 px-4 py-2">
                        Required
                    </th>
                    <th colSpan={3} className="border border-gray-200 bg-gray-50 px-4 py-2 font-semibold">
                        Available
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className="border border-gray-200 px-4 py-2 text-center">
                        <i className="mr-2 inline-block h-3 w-3 rounded-full bg-[#002D62]" style={{ backgroundColor: "#002D62" }} /> Required
                    </td>
                    <td className="border border-gray-200 px-4 py-2 text-center">
                        <i className="mr-2 inline-block h-3 w-3 rounded-full bg-emerald-500" style={{ backgroundColor: "#10b981" }} /> Covered
                    </td>
                    <td className="border border-gray-200 px-4 py-2 text-center">
                        <i className="mr-2 inline-block h-3 w-3 rounded-full bg-amber-500" style={{ backgroundColor: "#f59e0b" }} /> At risk
                    </td>
                    <td className="border border-gray-200 px-4 py-2 text-center">
                        <i className="mr-2 inline-block h-3 w-3 rounded-full bg-red-500" style={{ backgroundColor: "#ef4444" }} /> Critical
                    </td>
                </tr>
            </tbody>
        </table>
    );

    return (
        <div>
            <div className="mb-2 flex justify-end">
                <button type="button" onClick={() => setIsExpanded(true)} 
                    className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    aria-label="Expand skill gap chart"
                    title="Expand chart"
                    > 
                <Maximize2 size={16} />
                Expand Chart
                </button>
            </div>
            {renderChart(chartHeight)}
            {renderLegend()}

            {isExpanded && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 md:p-8"
                      role="dialog" 
                      aria-modal="true" 
                      aria-label="Expanded skill gap chart" 
                >
                    <div className="flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
                        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                SKill Gap Analysis
                            </h2>

                            <button type="button" onClick={() => setIsExpanded(false)} 
                            className = "rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                            aria-label="Close expanded chart"
                            title = "Close chart"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5">
                            <div className="min-h-0 flex-1">
                                {renderChart("100%")}
                            </div>
                            {renderLegend()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};