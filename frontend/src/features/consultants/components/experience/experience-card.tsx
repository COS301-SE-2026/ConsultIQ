import { Badge } from "../../../../components/ui/badge";
import { Card } from "../../../../components/ui/card";

type Props = {
    experience?: {
        jobTitle: string;
        companyName: string;
        jobType: string;
        workModel: string;
        startDate: string;
        endDate: string;
        description: string;
    };
};

export default function ExperienceCard({ experience }: Props) {
    if (!experience) {
        return (
            <Card className="border border-slate-200 shadow-sm" style={{ padding: "32px" }}>
                <h3 className="text-2xl font-semibold mb-4">
                    TrendIQ.com
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-slate-600">
                    <span>Front-End Developer</span>

                    <Badge style={{ padding: "4px 12px" }}>
                        Full-time
                    </Badge>

                    <span>1 year 2 months</span>

                    <span>Oct 2021 - Dec 2022</span>
                </div>
            </Card>
        );
    }

    return (
        <Card className="border border-slate-200 shadow-sm" style={{ padding: "32px" }}>
            <h3 className="text-2xl font-semibold mb-2" style={{ color: "var(--color-primary)" }}>
                {experience.companyName}
            </h3>

            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600 mb-4">
                <span className="font-semibold text-slate-800">{experience.jobTitle}</span>

                {experience.jobType && (
                    <Badge style={{ padding: "4px 12px" }}>
                        {experience.jobType}
                    </Badge>
                )}

                {experience.workModel && (
                    <Badge variant="outline" style={{ padding: "4px 12px" }}>
                        {experience.workModel}
                    </Badge>
                )}

                <span>
                    {experience.startDate} {experience.startDate && "to"} {experience.endDate || (experience.startDate && "Present")}
                </span>
            </div>

            {experience.description && (
                <p className="text-sm text-slate-600 whitespace-pre-wrap mt-4">
                    {experience.description}
                </p>
            )}
        </Card>
    );
}