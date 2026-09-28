import { type SkillRecommendation } from "../types/consultant.types"
import { Card } from "../../../components/ui/card";


interface GrowthCompassProps {
    recommendations: SkillRecommendation[];
    isLoading?: boolean;
    isError?: boolean;
}

function CardHeader() {
    return (
        <div className="flex items-center gap-5">
            <div className="flex h-15 w-15 min-h-[60px] min-w-[60px] items-center justify-center rounded-full bg-brand-navy text-sm font-bold text-white">
                AI
            </div>
            <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#9A7A2C]">
                    Growth compass
                </p>
                <p className="mt-1 text-sm text-brand-muted">Your top recommended skill</p>
            </div>

        </div>
    );
}

interface StatTileProps {
    readonly label: string;
    readonly value: string | number;
    readonly unit: string;
}

function StatTile({ label, value, unit }: StatTileProps) {
    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-7">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
            <p className="mt-4 text-[#0B2F63]">
                <span className="text-3xl font-bold">{value}</span>
                <span className="ml-1.5 font-semibold text-brand-muted">{unit}</span>
            </p>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="mt-10 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-8 py-12 text-center">
            <p className="text-2xl font-bold text-brand-navy">You're fully aligned with current demand</p>
            <p className="mx-auto mt-3 max-w-md text-brand-muted">
                No single skill would raise your match score right now. Check back as new projects enter the pipeline.
            </p>
        </div>
    );
}



function RowStat({ label, value }: { readonly label: string; readonly value: string }) {
    return (
        <div className="min-w-30">
            <dt className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</dt>
            <dd className="mt-2 font-bold text-brand-navy">{value}</dd>
        </div>
    );
}


function LoadingState() {
    return (
        <div className=" mt-10 animate-pulse " aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading your recommendation</span>
            <div className="h-10 w-2/3 rounded bg-gray-200" />
            <div className="mt-4 h-4 w-full max-w-2xl rounded bg-gray-100" />
            <div className="mt-2 h-4 w-1/2 rounded bg-gray-100" />
            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-28 rounded-lg bg-gray-100" />
                ))}
            </div>
        </div>


    );
}

interface SkillRowProps {
    readonly rank: number;
    rec: SkillRecommendation;
}

function SkillRow({ rank, rec }: SkillRowProps) {
    return (
        <li className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-brand-navy">
                    {rank}
                </span>
                <span className="font-bold text-brand-navy">{rec.skillName}</span>
            </div>

            <dl className="grid grid-cols-3 gap-6 md:gap-10">
                <RowStat
                    label="Total delta"
                    value={`${formatDelta(rec.totalScoreDelta)} ${plural(rec.totalScoreDelta, "point")}`}
                />
                <RowStat
                    label="Newly eligible"
                    value={`${rec.newlyEligibleProjectCount} ${plural(rec.newlyEligibleProjectCount, "project")}`}
                />
                <RowStat
                    label="Tested"
                    value={`${rec.projectsTested} ${plural(rec.projectsTested, "project")}`}
                />
            </dl>
        </li>
    );
}

const isViable = (rec: SkillRecommendation) =>
    rec.totalScoreDelta > 0 || rec.newlyEligibleProjectCount > 0;

const formatDelta = (delta: number) => (delta > 0 ? `+${delta}` : `${delta}`)

const plural = (count: number, word: string) =>
    `${word}${count === 1 ? "" : "s"}`;


export default function SkillGrowthCard({ recommendations, isLoading, isError }: GrowthCompassProps) {
    const ranked = recommendations.filter(isViable).sort(
        (a, b) =>
            b.totalScoreDelta - a.totalScoreDelta || b.newlyEligibleProjectCount - a.newlyEligibleProjectCount
    );

    const [top, ...others] = ranked;
    return (
        <Card className="overflow-hidden rounded-lg border border-gray-200 border-t-4 border-t-[#C9A44C] bg-white shadow-sm">
            <div className="p-8">
                {isError && !isLoading && (
                    <div
                        role="status"
                        className="mb-6 rounded-md border border-yellow-300 bg-yellow-50 px-5 py-3 text-sm text-yellow-900"
                    >
                        We couldn't refresh your recommendation. Showing the latest Available guidance.
                    </div>
                )}
                <CardHeader />

                {isLoading ? (
                    <LoadingState />
                ) : !top ? (
                    <EmptyState />
                ) : (
                    <>
                        <h2 className="mt-10 text-4xl font-bold text-brand-blue">{top.skillName}</h2>
                        <p className="mt-4 max-w-2xl leading-relaxed text-brand-muted">
                            This skill creates the strongest match between your profile and current project demand across the tested pipeline.
                        </p>

                        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
                            <StatTile
                                label="Total score improvement"
                                value={formatDelta(top.totalScoreDelta)}
                                unit={plural(top.totalScoreDelta, "point")}
                            />
                            <StatTile
                                label="Newly eligible"
                                value={top.newlyEligibleProjectCount}
                                unit={plural(top.newlyEligibleProjectCount, "project")}
                            />
                            <StatTile
                                label="Projects tested"
                                value={top.projectsTested}
                                unit={plural(top.projectsTested, "project")}
                            />

                        </div>

                        {others.length > 0 && (
                            <div className="mt-10 border-t border-gray-200 pt-10">
                                <div className="flex items-end justify-between gap-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-brand-navy">More recommended skills</h3>
                                        <p className="mt-1 text-sm text-brand-muted">Ranked by their projected impact on your profile</p>
                                    </div>
                                    <span className="rounded-md bg-gray-100 px-4 py-1.5 text-xs font-semibold text-brand-muted">
                                        {ranked.length} recommendations
                                    </span>
                                </div>

                                <ul className="mt-4 divide-y divide-gray-200">
                                    {others.map((rec,i) => (
                                        <SkillRow key={rec.skillName} rank={i +2} rec={rec}/>
                                    ))}
                                </ul>

                            </div>
                        )}
                    </>
                )}
            </div>
        </Card>
    );
}