import { useState, useEffect } from "react";
import ExperienceForm from "../components/experience/experience-form";
import ExperienceList from "../components/experience/experience-list";

export type ExperienceItem = {
    id: string;
    jobTitle: string;
    companyName: string;
    jobType: string;
    workModel: string;
    startDate: string;
    endDate: string;
    description: string;
};

const sanitizeInput = (input: string) => {
    if (!input) return "";
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/\//g, "&#x2F;");
};

export default function ExperienceTab() {
    const [experiences, setExperiences] = useState<ExperienceItem[]>(() => {
        const saved = sessionStorage.getItem("experience_list");
        if (saved) {
                return JSON.parse(saved);
        }
        return [];
    });

    const handleAddExperience = (exp: Omit<ExperienceItem, "id">) => {
        setExperiences([...experiences, { ...exp, id: crypto.randomUUID() }]);
    };

    useEffect(() => {
        const sanitizedList = experiences.map((exp) => ({
            ...exp,
            jobTitle: sanitizeInput(exp.jobTitle),
            companyName: sanitizeInput(exp.companyName),
            jobType: sanitizeInput(exp.jobType),
            workModel: sanitizeInput(exp.workModel),
            startDate: sanitizeInput(exp.startDate),
            endDate: sanitizeInput(exp.endDate),
            description: sanitizeInput(exp.description),
        }));
        sessionStorage.setItem("experience_list", JSON.stringify(sanitizedList));
    }, [experiences]);

    return (
        <div className="space-y-8">
            <ExperienceForm onAdd={handleAddExperience} />
            <div className="h-6" />
            <ExperienceList experiences={experiences} />
        </div>
    );
}