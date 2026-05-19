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

export default function ExperienceTab() {
    const [experiences, setExperiences] = useState<ExperienceItem[]>(() => {
        const saved = sessionStorage.getItem("experience_list");
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return [];
            }
        }
        return [];
    });

    const handleAddExperience = (exp: Omit<ExperienceItem, "id">) => {
        setExperiences([...experiences, { ...exp, id: crypto.randomUUID() }]);
    };

    useEffect(() => {
        sessionStorage.setItem("experience_list", JSON.stringify(experiences));
    }, [experiences]);

    return (
        <div className="space-y-8">
            <ExperienceForm onAdd={handleAddExperience} />
            <div className="h-6" />
            <ExperienceList experiences={experiences} />
        </div>
    );
}