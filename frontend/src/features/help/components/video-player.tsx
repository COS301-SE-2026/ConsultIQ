
interface VideoPlayerProps{
    title:string;
    videoId: string;
}
export default function VideoPlayer({title,videoId}:VideoPlayerProps){
    return(
        <div className="w-full rounded-2xl relative overflow-hidden bg-black">
            {title}
            {videoId}

        </div>
    );
}