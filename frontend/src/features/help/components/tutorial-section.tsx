import VideoCard from "./video-card";
import { PlayCircle } from "lucide-react";
import VideoPlayer from "./video-player";
import { useState } from "react";
import type { TutorialItem } from "./tutorials.data";
import { tutorials } from "./tutorials.data";



export default function TutorialSection(){
    const [activeVideo, setActiveVideo] = useState<TutorialItem | null>(null);
    return(
        <div className="flex flex-col gap-6 py-8 md:py-8 px-4 sm:px-0">
            <div className="flex flex-col gap-1">
                <p className="font-bold text-brand-muted text-2xl tracking-wide mb-1 sm:text-2xl ">Video tutorials</p>
                <h2 className="font-bold text-2xl sm:text-2xl">Learn ConsultIQ step-by-step</h2>
            </div>

            <div className=" flex items-center gap-2 text-sm text-brand-muted">
                <span><PlayCircle/>{tutorials.length} videos</span>
                <span >&middot;</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 ">
                {tutorials.map((t)=> (
                <VideoCard 
                  key={t.embedUrl} 
                  tutorial={t} 
                  onSelect={() => setActiveVideo(t)}
                  /> 
                  ))}
            </div>
            {activeVideo &&(
              <VideoPlayer
                video={activeVideo}
                onClose={()=> setActiveVideo(null)}
              />
            )}
        </div>
    );

}