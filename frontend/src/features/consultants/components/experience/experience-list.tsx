import { Card } from "../../../../components/ui/card";

import ExperienceCard from "./experience-card";

type ExperienceItem = {
    readonly id: string;
    readonly jobTitle: string;
    readonly companyName: string;
    readonly jobType: string;
    readonly workModel: string;
    readonly startDate: string;
    readonly endDate: string;
    readonly description: string;
};

type Props = {
    experiences?: ExperienceItem[];
};

export default function ExperienceList({ experiences = [] }: Props) {
    return (
        <Card className="p-12 h-full w-full flex items-start justify-center">
            <div className="w-full max-w-[800px] flex flex-col h-full">
                <div className="h-6" />
                <h2 className="text-3xl font-bold mb-8" style={{ color: "var(--color-primary)" }}>
                    All Experience
                </h2>
                <div className="h-6" />

                <div className="flex flex-col gap-6 flex-1">
                {experiences.length > 0 ? (
                    experiences.map((exp) => (
                        <ExperienceCard key={exp.id} experience={exp} />
                    ))
                    
                ) : (
                    <p className="text-slate-500 text-center py-8">No experience added yet.</p>
                )}
                </div>
                <div className="h-6" />
            </div>
        </Card>
    );
}