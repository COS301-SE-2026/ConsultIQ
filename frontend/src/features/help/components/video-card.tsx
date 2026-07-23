import type  {TutorialItem} from "./tutorials.data" 



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
                <div className="aspect-video bg-slate-900 flex items-center justify-center">
                    <span>Click here to play</span>
                </div>
               <div className="flex flex-col p-4  gap-2">
                    <h4 className="font-bold text-brand-blue text-base sm:text-lg leading-snug group-hover:text-brand-blue transition-colors">{tutorial.title}</h4>
                     <p className="text-sm leading-relaxed sm:text-base text-slate-500 line-clamp-2">{tutorial.desc}</p>  
                </div>  
             </div>
        </button>
       
    );
}