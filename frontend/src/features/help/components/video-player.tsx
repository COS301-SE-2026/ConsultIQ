import type { TutorialItem } from "./tutorials.data";
import { Button } from "../../../components/ui/button";
import {X} from "lucide-react"
interface VideoPlayerProps{
    readonly video: TutorialItem;
    readonly onClose: () => void;
}
export default function VideoPlayer({video, onClose}:VideoPlayerProps){
    return(
       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"> 
            <div className=" absolute inset-0"/>
            <div className="relative w-full max-w-3xl flex flex-col gap-4 p-4 bg-brand-bg rounded-xl border border-slate-850 overflow-hidden shadow-2xl ">
                <div className=" flex items-center gap-5">
                    <h3 >{video.title}</h3>
                    <Button
                        onClick={onClose}
                        className="text-brand-muted hover:text-white p-1 rounded-lg bg-slate-navy hover:bg-slate-800 transition-colors "
                    >
                        <X size={18} />
                    </Button>
                </div>

                <div className="relative w-full rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center text-brand-muted text-sm border border-slate-900">
                    <div>
                        <p>video goes here</p>
                        <p className="text-xs text-brand-muted mt-1">{video.title}</p>
                    </div>
                </div>
            </div>
       </div>
    );
}