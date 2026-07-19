import { Target, Sliders,LayoutDashboard, Icon, 
    BookOpen, TrendingUp,MapPin,DollarSign,Clock } from "lucide-react";
import ScoringFeatureCard from "./scoring-feature-card";

const SCORING_FEATURES =[
    {
        icon: Target,
        title: "Fit Score Matching Engine",
        description: "Computes a weighted fit score for every consultant against a given project, incorporating skill alignment, competency level,location, cost to company rate and real time availability- in a single number. ",
        badge: "Core Engine",

    },
    {
        icon: Sliders,
        title: "Two-Tier Configurable Scoring",
        description: "Configure scoring at two levels: a consultancy-wide default sets baseline factor weights, while project managers can adjust factors per project. Project-level settings always take precedence. ",
        badge: "Configurable",
    },
    {
        icon: LayoutDashboard,
        title: "Placement Recommendation Dashboard",
        description: "Displays a ranked list of recommended consultants per project with a transparent breakdown of how each score was calculated - giving managers explainable recommendations they can defend to clients. ",
        badge: "Dashboard",
    },
];

const SCORE_FACTORS =[
    {label: "Skill Alignment", icon: BookOpen, colour: "#002d62"},
    {label: "Competency level", icon: TrendingUp, colour: "#1a5ba8"},
    {label: "Location", icon: MapPin, color: "#2a7fd4"},
    {label: "Cost to company rate", icon: DollarSign, colour: "#3a9fe0"},
    {label: "Availability", icon: Clock, colour: "#4abfec"},
];

export default function PlacementSection(){
    return(
         <div className="relative min-h-175 flex flex-col items-center  pt-20 justify-start p-8 gap-10 w-full">
                <div className="flex flex-col items-center gap-2 text-center max-w-4xl mx-auto gap-y-5">
                    <span className=" inline-block  gap-2 px-3 py-1.5 bg-[#fdf6e7] text-[#8a6420] border border-brand-gold text-xs font-bold rounded-full mb-4">
                        Intelligent Placement
                    </span>
                   
                    <h2 className="text-brand-blue! text-5xl font-bold ">
                        The engine behind every great placement.
                    </h2>
                    
                    <p className="text-lg text-brand-muted max-w-xl ">
                    ConsultIQ's three-part placement intelligence stack turns subjective gut-feel decisions into objective, 
                    auditable, configurable recommendations. 
                    </p>
                </div>  

                <div className=" mt-14 grid w-full max-w-7xl grid-cols-3 gap-6">
                    {SCORING_FEATURES.map(({icon:Icon,title,description,badge}) => (
                        <ScoringFeatureCard key={title} icon={Icon} title={title} description={description} badge={badge}/>
                    ))}

                </div>

                <div className="mt-10 p-6 max-w-7xl w-full bg-white! rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col gap-y-5 ">
                    <p className="text-sm font-bold text-brand-muted uppercase tracking-widest ">5 weighted scoring dimensions </p>
                    <div className="flex flex-wrap gap-3 w-full">
                        {SCORE_FACTORS.map(({label,icon:Icon,colour}) =>(
                            <div
                                key={label}
                                className="flex flex-1 min-w-[180px] justfy-center items-center gap-2 px-4 py-2.5 rounded-full border border-dashed border-brand-slate bg-[#eef4fb] text-sm text-brand-muted font-semibold"
                            >
                                <Icon size={14} style={{color:colour}}/>
                                {label}
                            </div>
                        ))}

                    </div> 
                </div>

               
        </div>

       
    );
}