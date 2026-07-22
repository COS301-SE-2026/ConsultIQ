import { CheckCircle } from "lucide-react";
import ConfigurationImage from "../../../assets/configuration.png"

export default function ConfigurationSection(){
    return(
        <div className="flex flex-col  lg:flex-row items-center lg:items-center justify-center gap-12 px-8 py-6 max-w-7xl mx-auto">
             <div className="flex flex-1 flex-col items-start gap-6 max-w-2xl ">
               <span className=" inline-block px-4 py-1.5 bg-[#fdf6e7] text-[#8a6420] border border-brand-gold text-xs font-bold rounded-full ">
                    Two-Tier Configuration
                </span>

                <h2 className="text-brand-blue! font-bold text-4xl md:text-5xl leading-tight tracking-tight">
                    One global default.<br/>Unlimited projects override.
                </h2>

                <p className="text-brand-muted! text-lg mb-2 leading-relaxed">
                    Set your consultancy's baseline scoring weights once - then let project managers
                    adapt them for each engagement. A client prioritising cost containment gets a
                    different ranked list than one prioritising skill depth, all from the same consultant
                    pool.
                </p>

                <ul className="space-y-4 w-full ">
                    <li className="flex items-center gap-3 text-base text-[#1f2937]"> 
                        <CheckCircle size={18} className="text-brand-gold"/>
                        Consultancy-wide defaults define bseline factor inclusions and weights
                    </li>
                     <li className="flex items-center gap-3 text-base text-[#1f2937]">
                        <CheckCircle size={18} className="text-brand-gold"/>
                        Project managers activate, deactivate, or reweight factors per engagement
                    </li>
                    <li className="flex items-center gap-3 text-base text-[#1f2937]">
                        <CheckCircle size={18} className="text-brand-gold mt-0.5 shrink-0"/>
                        Project-level settings always take precedence over the consultancy default
                    </li>
                   
                </ul>        
        </div>

        <div className="flex-1 flex justify-center lg:justify-end w-full">
             <img src={ConfigurationImage} alt="Configuration interface" className="w-full max-w-md lg:max-w-2xl h-auto object-contain"/>
        </div>
           
        </div>
       
    );
}