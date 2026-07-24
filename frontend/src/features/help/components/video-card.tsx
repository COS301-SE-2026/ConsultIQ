import type  {TutorialItem} from "./tutorials.data" 
import { Play } from "lucide-react";


interface VideoCardProps{
   readonly tutorial:  TutorialItem;
    readonly onSelect: () => void;
}

export default function VideoCard({tutorial , onSelect}:VideoCardProps){
    return(
        <button
            type="button"
            onClick={onSelect}
            className="rounded-xl overflow-hidden bg-white flex flex-col border border-solid border-slate-200 shadow-sm w-full  max-x-xl mx auto text-left cursor-pointer hover:shadow-slate-400"
        >
            <div className="p-4 flex flex-col gap-2">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900">
                    <img src={tutorial.thumbnail} alt={tutorial.title} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0  jus bg-black/30 hover:bg-black/40 transition-colors flex items-center justify-center">
                        <span className="flex items-center justify-center w-14 h-14 rounded-full bg-brand-blue">
                            <Play className="w-6 h-6 text-white"/>
                        </span>
                    </div>
                </div>
                
               <div className="flex flex-col p-4  gap-2">
                    <h4 className="font-bold text-brand-blue text-base sm:text-lg leading-snug group-hover:text-brand-blue transition-colors">{tutorial.title}</h4>
                     <p className="text-sm leading-relaxed sm:text-base text-slate-500 line-clamp-2">{tutorial.desc}</p>  
                     <span className="text-sm leading-relaxed sm:text-base text-slate-500">{tutorial.duration}</span>
                </div>  
             </div>
        </button>
       
    );
}