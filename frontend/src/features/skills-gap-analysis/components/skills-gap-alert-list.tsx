import React, { useState} from "react";
import { type ProjectGapAlert } from "../types/skill-gap.types";
import { SkillGapAlertCard } from "./skills-gap-alert-card";

interface SkillGapAlertsListProps {
    readonly alerts: ProjectGapAlert[];
    readonly maxHeight?: string;
}

export const SkillGapAlertsList: React.FC<SkillGapAlertsListProps> = ({alerts, maxHeight = "max-h-96"}) =>{
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    const handleDismissed = (projectId: string) =>{
        setDismissed((prev) => new Set(prev).add(projectId));
    };

    const visibleAlerts = alerts.filter((alert) => !dismissed.has(alert.projectId));

    if(visibleAlerts.length === 0){
        return (
            <div className="p-8 text-center text-gray-500">
                <p>No skill gaps detected across portfolio.</p>
            </div>
        );
    }

    return(
        <div className={`overflow-y-auto ${maxHeight}`}>
            <div className="space-y-3 p-4">
                {visibleAlerts.map((alert) => (
                    <SkillGapAlertCard key={alert.projectId} alert={alert} onDismiss={() =>handleDismissed(alert.projectId)} />)
                )}
            </div>
        </div>
    );
};