import { type SkillRecommendation } from "../types/consultant.types"
import { Card } from "../../../components/ui/card";


interface GrowthCompassProps {
    readonly recommendations: SkillRecommendation[];
    readonly isLoading?: boolean;
    readonly isError?: boolean;
}

function CardHeader() {
    return (
        <div>
            <p className="text-lg font-bold uppercase tracking-widest text-[#9A7A2C]">
                Growth compass
            </p>
            <p className="mt-2 text-xl text-brand-muted">Your top recommended skill</p>
        </div>
    );
}

interface StatTileProps {
    readonly label: string;
    readonly value: string | number;
    readonly unit?: string;
    readonly caption: string;
    readonly highlighted?: boolean;
}

function StatTile({ label, value, unit, caption, highlighted }: StatTileProps) {
    return (
        <div className={`rounded-lg border bg-[#F4F6F9] px-6 py-7 ${highlighted ? "border-2 border-[#E6D6A6]" : "border-gray-200"
            }`}>
            <p
                className={`text-xs font-semibold uppercase tracking-wide ${highlighted ? "text-[#9A7A2C]" : "text-[#4B5563]"
                    }`}
            >
                {label}
            </p>
            <p className="mt-4 text-[#0B2F63]">
                <span className="text-3xl font-bold">{value}</span>
                {unit && <span className="ml-1.5 text-base font-semibold text-brand-muted">{unit}</span>}
            </p>
            <p className={`mt-2 text-sm ${highlighted ? "text-[#9A7A2C]" : "text-[#4B5563]"}`}>
                {caption}
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



function RowStat({ label, value }: { readonly label: string; readonly value: string | number }) {
    return (
        <div className="min-w-30">
            <dt className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</dt>
            <dd className="mt-2 font-bold text-base text-brand-navy">{value}</dd>
        </div>
    );
}

function RankBadge({ rank }: { readonly rank: number }) {
    return (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F4F6F9] text-xs font-bold text-[#0B2F63]">
            {rank}
        </span>
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
                <RankBadge rank={rank} />
                <span className=" text-lg font-bold text-brand-navy">{rec.skillName}</span>
            </div>

            <dl className="grid grid-cols-2  gap-6 sm:grid-cols-4 md:gap-8">
                <RowStat
                    label="Placement percentage lift"
                    value={`${formatDelta(rec.totalScoreDelta)}%`}
                />
                <RowStat
                    label="Without skill"
                    value={`${formatDelta(rec.totalScoreDelta)}`}
                />
                <RowStat
                    label="Newly eligible"
                    value={formatDelta(rec.newlyEligibleProjectCount)}
                />
                <RowStat
                    label="Tested"
                    value={rec.projectsTested}
                />
            </dl>
        </li>
    );
}

const isViable = (rec: SkillRecommendation) =>
    rec.totalScoreDelta > 0 || rec.newlyEligibleProjectCount > 0;

const formatDelta = (delta: number) => (delta > 0 ? `+${delta}` : `${delta}`);


export default function SkillGrowthCard({ recommendations, isLoading, isError }: GrowthCompassProps) {
    const ranked = recommendations.filter(isViable).sort(
        (a, b) =>
            b.totalScoreDelta - a.totalScoreDelta || b.newlyEligibleProjectCount - a.newlyEligibleProjectCount
    );

    const [top, ...others] = ranked;
    return (
        <Card className=" gap-0 overflow-hidden rounded-lg border border-gray-200 border-t-4 border-t-[#C9A44C] bg-white shadow-sm">
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
                        <div className="mt-10 flex items-center gap-4">
                            <RankBadge rank={1} />
                            <h2 className="text-4xl font-bold text-brand-blue">{top.skillName}</h2>
                        </div>

                        <p className="mt-6 max-w-2xl leading-relaxed text-brand-muted">
                            This skill creates the strongest match between your profile and current project demand across the tested pipeline.
                        </p>

                        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            <StatTile
                                label="Placement likelihood"
                                value={formatDelta(top.totalScoreDelta)}
                                unit="%"
                                caption="higher chance of being placed"
                            />
                            <StatTile
                                label="Newly eligible"
                                value={top.newlyEligibleProjectCount}
                                caption="in the simulation pipeline"
                            />
                            <StatTile
                                label="Projects tested"
                                value={top.projectsTested}
                                caption="in the simulation pipeline"
                            />
                            <StatTile
                                label="Without skill"
                                value={top.baselineScore}
                                caption="eligible projects today"
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
                                    {others.map((rec, i) => (
                                        <SkillRow key={rec.skillName} rank={i + 2} rec={rec} />
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