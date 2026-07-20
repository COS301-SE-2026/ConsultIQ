import VideoPlayer from "./video-player";
import type  {TutorialItem} from "./tutorial-section" 



interface VideoCardProps{
    tutorial:  TutorialItem;
}

export default function VideoCard({tutorial}:VideoCardProps){
    return(
        <div className="rounded-xl overflow-hidden bg-white flex flex-col border border-solid border-brand-muted shadow-sm">

            <VideoPlayer videoId={tutorial.id} title={tutorial.title}/>
            <div className="p-4 flex flex-col gap-2">
               <div className="flex items-center gap-2">
                    <h4>{tutorial.title}</h4>
                    <span>{tutorial.duration}</span>
                </div>
                <p className="text-sm leading-relaxed">{tutorial.desc}</p>  
            </div>
           
        </div>
    );
}