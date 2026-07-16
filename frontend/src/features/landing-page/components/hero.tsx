import { Target } from "lucide-react";


export default function HeroLandingPage(){
    return(
        <div className="relative min-h-175 flex items-center">
            <div className="absolute inset-0 opacity-10 overflow-hidden">
                <div 
                    className="absolute -inset-[50%] animate-[spin_20s_linear_infinite]" 
                    style={{
                        backgroundImage: "radial-gradient(circle at 70% 50%, #4a90d9 0%, transparent 60%), radial-gradient(circle at 20% 80%, #1a5ba8 0%, transparent 50%)",
                    }}
                
                />
            </div>
          

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                <span className=" inline-flex items-center gap-2 px-3 py-1.5 bg-brand-gold/15 text-brand-gold border border-brand-gold/50 font-medium rounded-full">
                    <Target size={12}/>
                    Intelligent Matching &middot; Fit Scoring &middot; Explainable Recommendations
                </span>
                <br />
                <br />
                <br />
                <br />
                <span className="text-white text-6xl font-bold"> Place the right consultant.{" "}</span>
                <br />
                <span className="text-brand-gold text-6xl font-bold">Every time.</span>
                <br />
                <br />
                <br />
                <p className="text-lg text-white/70 max-w-xl mb-6">
                    ConsultIQ automatically extracts CV data, computes a multifactor fitscore for every 
                    consultant against a project, resulting in a ranked list, with explainable recommondations
                    - so managers place faster and clients get better outcomes. 
                </p>


            </div>  
        </div> 
    );
}