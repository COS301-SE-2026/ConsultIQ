import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
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
            jobTitle: DOMPurify.sanitize(exp.jobTitle, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }),
            companyName: DOMPurify.sanitize(exp.companyName, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }),
            jobType: DOMPurify.sanitize(exp.jobType, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }),
            workModel: DOMPurify.sanitize(exp.workModel, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }),
            startDate: DOMPurify.sanitize(exp.startDate, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }),
            endDate: DOMPurify.sanitize(exp.endDate, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }),
            description: DOMPurify.sanitize(exp.description, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }),
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