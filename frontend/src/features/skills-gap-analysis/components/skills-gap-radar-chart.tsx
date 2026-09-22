import React, { useState, useEffect } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { type SkillGapItem } from "../types/skill-gap.types";

interface SkillGapRadarChartProps {
    readonly data: SkillGapItem[];
    readonly height?: number;
}

export const SkillGapRadarChart : React.FC<SkillGapRadarChartProps> =({data, height = 400}) =>{
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() =>{
        const updateViewport = () =>{ setIsMobile(window.innerWidth < 640);};
        updateViewport();
        window.addEventListener("resize", updateViewport);
    
        return () =>{window.removeEventListener("resize", updateViewport);};
    },[]);

    //only top 10 skills, to avoid cluttering
    const radarData = data.slice(0, 10).map((item) => ({
        name: item.skillName,
        coverage: Math.min(item.coveragePercent, 100),
    }));

    return (
        <ResponsiveContainer width="100%" height={isMobile ? Math.min(height, 300) : height}>
            <RadarChart data={radarData} margin={{top: 10, right: isMobile ? 8 : 24, bottom: 10, left : isMobile ? 8 : 24}} >
                <PolarGrid />
                <PolarAngleAxis dataKey="name" tick={ {fontSize: isMobile ? 9 : 12}} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={ {fontSize: isMobile ? 9 : 12}}  />
                <Radar 
                    name="Coverage %"
                    dataKey="coverage"
                    stroke="#002D62" 
                    fill="#002D62"
                    fillOpacity={0.6}
                />
                <Tooltip formatter={(value) => value!==undefined ? `${Number(value).toFixed(1)}%` : "N/A"}/>
                <Legend wrapperStyle={{ fontSize: isMobile ? "11px" : "14px"}}/>
            </RadarChart>
        </ResponsiveContainer>
    );
};