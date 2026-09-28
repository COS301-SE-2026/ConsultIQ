
interface AnalyticsCardProps {
    readonly label: string;
    readonly value: number | string;
    readonly variant?: "default" | "gold";
    readonly valueKey?: string; //this is optional it doesn't have to be there
}

const variantStyle: Record<NonNullable<AnalyticsCardProps["variant"]>,string>={
    default:"",
    gold: "border-t-4 border-t-[#c9a84c]"

}

export default function AnalyticsCard({ label, value, variant="default",valueKey }: AnalyticsCardProps) {
    return (
        <div className={`flex min-w-0 w-full flex-col rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm sm:p-5 ${variantStyle[variant]}`} >
            <h2 className="mb-2 min-h-0 truncate text-sm uppercase leading-snug tracking-wider text-brand-muted! sm:min-h-[2.5rem]">{label}</h2>
            <p className="mt-auto break-words text-2xl font-semibold leading-none text-(--color-primary)">{`${value} ${valueKey ?? ""}`}</p>
        </div>
    );

}