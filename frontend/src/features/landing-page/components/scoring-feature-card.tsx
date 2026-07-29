import type {LucideIcon} from "lucide-react";

interface ScoringFeatureProps{
    icon: LucideIcon;
    title:string;
    description:string;
    badge:string;
}

export default function ScoringFeatureCard({icon: Icon,title,description,badge}:ScoringFeatureProps){
    return(
        <div
            key={title}
            className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden shadow-sm hover:shadow-md flex flex-col"
        >
            <div className="bg-brand-blue  px-6 py-5 gap-4 flex items-start">
                <div className="w-12 h-12 rounded-lg bg-white/15! flex items-center justify-center shrink-0">
                    <Icon size={24} className="text-white"/>
                </div>

                <div>
                    <span className="font-bold text-white/50! uppercase tracking-widest ">{badge}</span>
                    <h3 className="font-bold text-white! text-base leading-tight mt-0.5 ">{title}</h3>
                </div>
            </div>

            <div className="p-6 flex-1">
                <p className="text-sm text-brand-muted leading-relaxed">{description}</p>
            </div>
            
        </div>
    );
}