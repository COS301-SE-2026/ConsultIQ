import VideoCard from "./video-card";
import { PlayCircle } from "lucide-react";
import VideoPlayer from "./video-player";
import { useState } from "react";

export interface TutorialItem{
    id:string;
    title: string;
    desc: string;
    duration: string;

}



export  const tutorials: TutorialItem[] = [
  {
    id: "ROl5qxDkfQY",
    title: "Full onboarding walkthrough",
    desc: "From account setup to your first ranked recommendation list — everything you need to get ConsultIQ running for your team.",
    duration: "8 min",
  },
  {
    id: "oUnB4lK616Y",
    title: "Building your first scoring model",
    desc: "Configure factor weights and understand how each dimension impacts final rankings and consultant fit scores.",
    duration: "7 min",
  },
  {
    id: "FfFXsYf3w1M",
    title: "Interpreting explainable AI scores",
    desc: "Learn to read score breakdowns per consultant and communicate the reasoning clearly to your clients.",
    duration: "5 min",
  },
  {
    id: "l5XALwTZMHQ",
    title: "Bulk CV upload & profile review",
    desc: "Upload hundreds of CVs at once and verify AI-parsed profiles — skills, competency, location, and availability — in one session.",
    duration: "6 min",
  },
  {
    id: "ScMzIvxBSi4",
    title: "Project-level configuration deep dive",
    desc: "Override global scoring weights per engagement without affecting any other project's default settings.",
    duration: "4 min",
  },
  {
    id: "UkG5L4B5-DQ",
    title: "Exporting recommendation reports",
    desc: "Generate client-ready PDFs with transparent, auditable score breakdowns for any project engagement.",
    duration: "3 min",
  },
];


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
                  key={t.id} 
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