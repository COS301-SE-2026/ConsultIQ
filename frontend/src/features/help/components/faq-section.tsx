import { useState } from "react";
import type { FAQItems } from "../pages/help-page";
import { ChevronDown } from "lucide-react";


export default function FaqSection({group,icon : Icon,items} :FAQItems){
    const [open,setOpen] = useState<number | null>(null);
    return(
        <div>
            <div className="flex items-center ">
                <div className="size-8 rounded-lg flex items-center justify-center bg-[#eef4fb]">
                    <Icon size={15} className="text-brand-blue troke-[1.75]"/>
                </div>
                <h3 className="text-sm font-bold">{group}</h3>
            </div>

            <div className="space-y-2">
                {items.map(({q,a}, i)=> (
                    <div>
                        <button
                            onClick={()=> setOpen(open === i ? null :i)}
                        >
                            <span>{q}</span>
                            <ChevronDown/>
                        </button>
                        {open === i &&(
                            <div>
                                <p>{a}</p>
                            </div>
                        )}
                    </div>
        
                ))}
            </div>
        </div>
    );
}