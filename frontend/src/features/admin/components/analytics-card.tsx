
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
        <div className={`rounded-xl border border-[#e2e8f0]  bg-white shadow-sm  w-full flex flex-col p-5 ${variantStyle[variant]}`} >
            <h2 className="text-sm text-brand-muted! uppercase tracking-wider mb-2 leading-snug min-h-[2.5rem]">{label}</h2>
            <p className="text-2xl text-(--color-primary) font-semibold leading-none mt-auto">{`${value} ${valueKey ?? ""}`}</p>
        </div>
    );

}