import type  {TutorialItem} from "./tutorial-section" 



interface VideoCardProps{
    tutorial:  TutorialItem;
    onSelect: () => void;
}

export default function VideoCard({tutorial , onSelect}:VideoCardProps){
    return(
        <div onClick={onSelect} className="rounded-xl overflow-hidden bg-white flex flex-col border border-solid border-slate-200 shadow-sm w-full max-x-xl mx auto">
            <div className="p-4 flex flex-col gap-2">

                <div className="aspect-video bg-slate-900 flex items-center justify-center">
                    <span>Click here to play</span>
                </div>
               <div className="flex flex-col p-4  gap-2">
                    <h4 className="font-bold text-brand-blue text-base sm:text-lg leading-snug group-hover:text-brand-blue transition-colors">{tutorial.title}</h4>
                     <p className="text-sm leading-relaxed sm:text-base text-slate-500 line-clamp-2">{tutorial.desc}</p>  
                </div>  
            </div>
           
        </div>
    );
}