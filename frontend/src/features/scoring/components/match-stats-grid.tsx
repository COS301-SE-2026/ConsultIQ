import CountCard from "../../admin/components/count-card";
import { Settings2, Users, UserCheck, UserX } from "lucide-react";

interface MatchStatsGridProps {
    readonly scoringBasis: 'Override' | 'Default';
    readonly totalEvaluated: number;
    readonly matched: number;
    readonly excluded: number;
}

export function MatchStatsGrid({ scoringBasis, totalEvaluated, matched, excluded }: MatchStatsGridProps) {
    const statsConfig = [
        {
            title: 'Scoring Basis',
            count: scoringBasis,
            icon: Settings2,
            iconBackgroundColour: '#eff6ff',
            iconColor: '#2563eb',
        },
        {
            title: 'Total Evaluated',
            count: totalEvaluated,
            icon: Users,
            iconBackgroundColour: '#ecfdf5',
            iconColor: '#059669',
        },
        {
            title: 'Placements',
            count: matched,
            icon: UserCheck,
            iconBackgroundColour: '#f0f9ff',
            iconColor: '#0284c7',
        },
        {
            title: 'Excluded',
            count: excluded,
            icon: UserX,
            iconBackgroundColour: '#fff1f2',
            iconColor: '#e11d48',
        },
    ];

    return (
        <div className="flex flex-wrap  max-w-[1600px] mx-auto w-full pb-8 mt-6 gap-4">
            {statsConfig.map((stat, idx) => (
                <CountCard
                    key={idx}
                    title={stat.title}
                    count={stat.count}
                    icon={stat.icon}
                    iconBackgroundColour={stat.iconBackgroundColour}
                    iconColour={stat.iconColor}
                />
            ))}
        </div>

    )
}