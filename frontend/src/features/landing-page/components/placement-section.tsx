export default function PlacementSection(){
    return(
         <div className="relative min-h-175 flex items-center">
            <div className="absolute inset-0 opacity-10 overflow-hidden">
                <div className="px-8 items-center justify-between">
                    <span className=" inline-block  gap-2 px-3 py-1.5 bg-[#fdf6e7] text-[#8a6420] border border-brand-gold/40 text-xs font-bold rounded-full mb-4">
                        Intelligent Placement
                    </span>
                    <br />
                    <br />
                    <span className="text-brand-blue! text-6xl font-bold">The engine behind every great placement.{" "}</span>
                    <br/>
                    <p className="text-lg text-brand-muted max-w-xl mb-6">
                    ConsultIQ's three-part placement intelligence stack turns subjective gut-feel decisions into objective, 
                    auditable, configurable recommendations. 
                    </p>
            </div>  
            </div>
        </div>
    );
}