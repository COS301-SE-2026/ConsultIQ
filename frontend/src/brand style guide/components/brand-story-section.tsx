import {Eye, LayoutGrid, ShieldCheck, Target, Sparkles, Accessibility} from "lucide-react";
import { Link } from "react-router-dom";

export default function BrandStorySection(){

const principles=[
    {title: "Clarity",description: "Every interface element communicates its purpose instantly. Labels, data displays, and interactions require no guesswork.", icon: Eye},
    {title: "Consistency",description: "Visual patterns, component behaviours, and terminology remain uniform across all views and user roles.", icon: LayoutGrid},
    {title: "Authority",description: "The interface projects confidence and competence, reinforcing trust in placement recommendations and scoring outputs.", icon: ShieldCheck},
    {title: "Simplicity",description:"Complexity is hidden behind clean interfaces. The matching engine's sophistication is felt in results, not visual clutter.", icon: Target},
    {title: "Responsiveness",description: "Layouts adapt gracefully to desktop, tablet, and mobile viewports without loss of functionality or legibility.", icon: Sparkles},
    {title: "Accessibility",description: "Strict WCAG 2.2 AA conformance ensures no feature or content is inaccessible to users of diverse abilities.", icon: Accessibility},

];

    return (
        <div className= "relative min-h-screen w-full overflow-hidden text-white rounded-2xl shadow-2xl mb-12" style={{ backgroundColor: "var(--color-primary)",}}>
          <div className= "relative z-10 px-8 py-16 md:px-16 md:py20 border-b border-white/10">
            <div className="max-w-4xl">
                <Link to="/brand-style-home" className= "inline-flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md border border-white/15 text-sm font-semibold text-accent mb-10">
                Back To Home
                </Link>
                <h1 className= " !text-4xl md:text-6xl font-bold tracking-tight !text-white mb-6 leading-tight">Visual Identity & <br/>
                <span className= "text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-sky-300 to-[var(--color-accent)] animate-gradient">Interface Standards</span>
                </h1>
                <p className= "text-lg md:text-xl text-slate-200 leading-relaxed font-normal max-w-3xl">
                    ConsultIQ is a consultant placement platform that helps consultancy firms place the right consultant on the right project. Its interface must communicate authority, precision, and trust – 
                    qualities that reflect both the diligence and precision of its matching algorithm and the professionalism expected by enterprise clients. 
                    <br/>This brand style guide defines the visual language that governs all ConsultIQ interfaces, design assets, and communications. Adherence ensures a consistent, accessible, and professional user experience across every touchpoint of the system. 
                </p>
            </div>
        </div>
        <div className="relative z-10 px-8 py-12 md:px-16 bg-black/10 backdrop-blur-sm">
            <div className="mb-8">
                <h2 className= "text-xl !font-bold !text-white tracking-wide">
                    Core Design Principles
                </h2>
                <p className="text-sm text-white/80">The six foundational pillars guiding every UI and UX decision within ConsultIQ.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">                {principles.map((item, itemIndex) =>{
                    const Icon= item.icon;
                    return (
                        <div key={item.title || itemIndex}
                        className="p-6 rounded-xl bg-white/10 border border-white/10 hover:border-accent/50 hover:bg-white/10 transition-all duration-300 flex flex-col justify-between group">
                            <div>
                                <div className="w-10 h-10flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform duration-300" >
                                    <Icon size={20} />
                                </div>
                                <h3 className="text-lg font-bold !text-white mb-2"> {item.title}</h3>
                                <p className="text-sm text-white/80 leading-relaxed">{item.description}</p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
        </div>
    );}