import { Zap, Upload, Eye, UserCheck } from "lucide-react";

const PROFILE_FEATURE =[
    {
        icon: Upload,
        title: "Instant CV upload",
        description: "Upload any CV in pdf or word format.",
    },
    {
        icon: Zap,
        title: "AI-Powered extraction",
        description: "Intelligent parsing automatically identifies and extracts personal details, skills, experience and education. ",

    },
    {
        icon: Eye,
        title: "Live Preview & Edit",
        description: "Review extracted data in a structured preview. Correct any fields before finalsing the profile. ",
       
    },
     {
        icon: UserCheck,
        title: "Structured Profiles",
        description: "Profiles stored in a consistent, searchable format - making it effortless to find the right consultant for any project. ",
       
    },
];

export default function ManagementSection(){
    return(
         <div className="relative min-h-175 flex flex-col items-center  pt-20 justify-start p-8 gap-10 w-full">
                <div className="flex flex-col items-center gap-2 text-center max-w-4xl mx-auto gap-y-5">
                    <span className=" inline-block  gap-2 px-3 py-1.5 bg-[#fdf6e7] text-[#8a6420] border border-brand-gold text-xs font-bold rounded-full mb-4">
                        Profile Management
                    </span>
                   
                    <h2 className="text-brand-blue! text-5xl font-bold ">
                        Profiles that feed the matching engine.
                    </h2>
                    
                    <p className="text-lg text-brand-muted max-w-xl ">
                        Every  consultant profile starts with a CV upload, ConsultIQ does the rest - 
                        extracting, structuring, and validating the data your scoring engine needs.
                    </p>
                </div> 
                <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-7xl">
                    {PROFILE_FEATURE.map(({icon:Icon,title,description}) => (
                        <div
                            key={title}
                            className="bg-white flex items-start gap-4 rounded-xl border border-brand-slate p-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="h-12 w-12 rounded-lg bg-[#eef4fb] flex items-center justify-center">
                                <Icon size={20} className="text-brand-blue"/>
                            </div>
                            <div >
                                <h3 className="font-bold mb-1.5">{title}</h3>
                                <p className="text-sm leading relaxed text-brand-muted">{description}</p>
                            </div>
                        </div>
                    ))}
                </div>

        </div>
        </div>
        
         
    );
}