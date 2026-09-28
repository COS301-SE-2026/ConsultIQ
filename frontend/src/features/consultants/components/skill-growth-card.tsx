import  {type SkillRecommendation} from "../types/consultant.types"
import { Card } from "../../../components/ui/card";


interface GrowthCompassProps{
    recommendations: SkillRecommendation[];
    isLoading?: boolean;
    isError?: boolean;
}

function CardHeader(){
    return(
        <div className="flex items-center gap-5">
            <div className="flex h-15 w-15 min-h-[60px] min-w-[60px] items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                AI
            </div>
            <div>
                <p  className="text-xs font-bold uppercase tracking-widest text-gold-dark">
                    Growth compass
                </p>
                <p className="mt-1 text-sm text-muted">Your top recommended skill</p>
            </div>

        </div>
    );
}

interface StatTileProps{
   readonly label: string;
   readonly value: string | number;
   readonly unit: string;
}

function StatTile({label, value, unit}:StatTileProps){
    return(
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-7">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
            <p>
                <span className="text-3xl font-bold">{value}</span>
                <span className="ml-1.5 font-semibold text-brand-muted">{unit}</span>
            </p>
        </div>
    );
}

function EmptyState(){
    return(
        <div className="mt-10 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-8 py-12 text-center">
            <p className="text-2xl font-bold text-brand-navy">You're fully aligned with current demand</p>
            <p className="mx-auto mt-3 max-w-md text-muted">
                No single skill would raise your match score right now. Check back as new projects enter the pipeline.
            </p>
        </div>
    );
}



function RowStat({label, value}:{readonly label: string; readonly value: string}){
    return(
        <div className="min-w-30">
            <dt className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{label}</dt>
            <dd className="mt-2 font-bold text-brand-navy">{value}</dd>
        </div>
    );
}


function LoadingState(){
    return(
        <div className=" mt-10 animate-pulse " aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading your recommendation</span>
        </div>
    );
}

interface SkillRowProps{
    readonly rank: number;
    rec: SkillRecommendation;
}

function SkillRow({rank, rec}: SkillRowProps){
    return(
        <li className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">

        </li>
    );
}

const isViable = (rec: SkillRecommendation) =>
    rec.totalScoreDelta > 0 || rec.newlyEligibleProjectCount > 0;

const formatDelta = (delta: number) => (delta > 0 ? `+${delta}` : `${delta}`)

const plural = (count: number, word : string) =>
    `${word}${count === 1 ? "" : "s"}`;


export default function SkillGrowthCard({recommendations, isLoading,isError}:GrowthCompassProps){
    const ranked = recommendations.filter(isViable).sort(
        (a,b) =>
            b.totalScoreDelta - a.totalScoreDelta || b.newlyEligibleProjectCount - a.newlyEligibleProjectCount
    );

    const [top, ...others] = ranked;
    return(
        <Card className="overflow-hidden rounded-lg border border-gray-200 border-t-4 border-t-gold bg-white shadow-sm">

        </Card>
    );
}