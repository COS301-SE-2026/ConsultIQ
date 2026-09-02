import React from "react";
import { type ProjectGapAlert } from "../types/skill-gap.types";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface SkillGapAlertCardProps {
    readonly alert: ProjectGapAlert;
    readonly onDismiss?: () => void;
}

export const SkillGapAlertCard: React.FC<SkillGapAlertCardProps> =({alert, onDismiss}) =>{
    const getSeverityStyles =(severity : string) =>{
        switch(severity){
            case "ADEQUATELY_COVERED":
                return { 
                    bg: "bg-green-50",
                    border: "border-green-200",
                    badge: "bg-green-100 text-green-800", 
                    icon: CheckCircle2,
                    iconColor: "text-green-600",
                };
            case "PARTIALLY_COVERED":
                return { 
                    bg: "bg-yellow-50",
                    border: "border-yellow-200",
                    badge: "bg-yellow-100 text-yellow-800", 
                    icon: AlertCircle,
                    iconColor: "text-yellow-600",
                };        
            case "NOT_COVERED":
                return { 
                    bg: "bg-red-50",
                    border: "border-red-200",
                    badge: "bg-red-100 text-red-800", 
                    icon: XCircle,
                    iconColor: "text-red-600",
                }; 
            default:
                return { 
                    bg: "bg-gray-50",
                    border: "border-gray-200",
                    badge: "bg-gray-100 text-gray-800", 
                    icon: AlertCircle,
                    iconColor: "text-gray-600",
                }; 
        }
    };

    const styles = getSeverityStyles(alert.severity);
    const IconComponent = styles.icon;

    return(
        <div className={`p-4 border rounded-lg ${styles.bg} ${styles.border}`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <IconComponent  className={`w-6 h-6 ${styles.iconColor}`} />
                    <div>
                        <h4 className="font-semibold text-gray-900">{alert.projectName}</h4>
                        <p className="text-sm text-gray-500">ID: {alert.projectId}</p>
                    </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${styles.badge}`}>
                    {alert.severity.replace("_", " ")}
                </span>
            </div>

            <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Gapped Skills: </p>
                <div className="space-y-1">
                    {alert.gappedSkills.map((skill) => (
                        <div key={skill.skillName} className="text-sm text-gray-600 ml-4">
                            <span className="font-medium">{skill.skillName}</span>
                            <span>({skill.availableCount} / {skill.requiredCount} available)</span>
                        </div>
                    ))}
                </div>
            </div>

            {onDismiss &&(
                <button onClick={onDismiss} className="mt-3 text-sm text-gray-500 hover:text-gray-700 underline">
                    Dismiss
                </button>
            )}  
        </div>
    );
};