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

const sanitizeText = (input: string) => {
    if (!input) return "";
    return input.replace(/[^a-zA-Z0-9\s.,&'\-@_+/#()!]/g, "");
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
            jobTitle: sanitizeText(exp.jobTitle),
            companyName: sanitizeText(exp.companyName),
            jobType: sanitizeText(exp.jobType),
            workModel: sanitizeText(exp.workModel),
            startDate: sanitizeText(exp.startDate),
            endDate: sanitizeText(exp.endDate),
            description: sanitizeText(exp.description),
        }));
        sessionStorage.setItem("experience_list", JSON.stringify(sanitizedList)); //NOSONAR
    }, [experiences]);

    return (
        <div className="space-y-8">
            <ExperienceForm onAdd={handleAddExperience} />
            <div className="h-6" />
            <ExperienceList experiences={experiences} />
        </div>
    );
}