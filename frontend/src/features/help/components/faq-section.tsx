import { useState } from "react";
import type { FAQItems } from "../pages/help-page";
import { ChevronDown } from "lucide-react";
import { Button } from "../../../components/ui/button";


export default function FaqSection({group,icon : Icon,items} :FAQItems){
    const [open,setOpen] = useState<number | null>(null);
    return(
        <div className="w-full max-w-xl mx-auto">
            <div className="flex items-center gap-2.5 mb-3 sm:mb-3">
                <div className="size-8 rounded-lg flex items-center justify-center bg-brand-slate shrink-0">
                    <Icon size={15} className="text-brand-blue stroke-[1.75]"/>
                </div>
                <h3 className="text-sm font-bold text-brand-blue">{group}</h3>
            </div>

            <div className="space-y-2">
                {items.map(({q,a}, i)=> {
                    const isOpen= open === i;
                    return(
                      <div 
                        key={i} 
                        className={`rounded-lg overflow-hidden transition-all" ${isOpen ? "border border-slate-500" 
                            : "border border-slate-300"
                        } ` }
                      >
                        <Button
                            variant="ghost"
                            onClick={()=> setOpen(open === i ? null :i)}
                            className="w-full flex h-auto py-3.5 item-center justify-between"
                        >
                            <span className="text-sm font-semibold pr-4 leading-snug">{q}</span>
                            <ChevronDown size={14} className={`text-brand-blue stroke-2 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" :"rotate-0"}`}/>
                        </Button>
                        {open === i &&(
                            <div className="px-4 pb-4 pt-2 bg-[#f9fafb]">
                                <p className="text-sm leading-relaxed text-brand-muted">{a}</p>
                            </div>
                        )}
                     </div>  
                    );
        })}
            </div>
        </div>
    );
}