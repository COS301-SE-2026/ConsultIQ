import { Link } from "react-router-dom";
import consultIqLogo from "../../assets/logos/ConsultIQ Logo Dark.png"

interface NavButton{
    readonly label: string;
    readonly href: string; 
}

const NAV_BUTTONS: NavButton[]=[
    {label:"Brand Story", href: "/brand-story-section"},
    {label: "Colors", href: "/brand-colors-section"},
    {label: "Typography", href: "/brand-typography-section"},
    {label: "Spacing", href: "/brand-spacing-section"},
    {label: "Icons", href: "/brand-icons-section"},
    {label: "Tone", href: "/brand-tone-section"},
    {label: "Components", href: "/brand-components-section"},
    {label: "Accessibility", href: "/brand-accessibility-section"},
    {label: "Responsiveness", href: "/brand-responsiveness-section"},
    {label: "Changelog",href: "/brand-changelog-section"},
];

export default function StyleGuideHome(){
    return (
        <div className= "relative min-h-screen w-full bg-primary text-white flex flex-col justify-between overflow-hidden p-8 md:p-16"
        style={{backgroundImage: "linear-gradient(135deg, #002D62 0%, #0B3C78 50%, #002D62 100%)"}}>
            
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute right-20 top-40 w-[320px] h-[320px] rounded-full blur-[100px] opacity-50 animate-float-slow"
            style={{background: "radial-gradient(circle, rgba(58, 110, 165, 0.65) 0%, transparent 75%)",}}
            />
                <div className= "absolute top-0 right-0 w-[190px] h-[30vh] z-10 animate-float-reverse" style={{background: "rgba(52, 84, 132, 0.99)", boxShadow: "0 4px 4px rgba(0,0,0,0.30)"}}/>
                <div className= "absolute right-[190px] bottom-0 w-[190px] h-[70vh] z-10 animate-float-slow" style={{background: "rgba(48, 80, 129, 0.99)", boxShadow: "inset 0 4px 4px rgba(0,0,0,0.30)"}}/>

        </div>
            <div className="relative z-10">
            <div className="max-w-xl ">
                <Link to="/" className="inline-flex items-center gap-3 px-3 py-5 rounded-2xl" >
                <span className="flex items-center justify-center text-accent font-bold text-lg border rounded-full px-4 py-1">
                     consultIQ
                </span>
                </Link>
                <h1 className="!text-5xl sm:!text-6xl md:!text-7xl !font-normal tracking-tight !text-white leading-[1.15]">
                    Brand <br/>
                    Style<br />
                    Guidelines
                </h1>
            </div>
            </div>

            <div className="relative z-10 w-full max-w-4xl mt-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
                    {NAV_BUTTONS.map((button) =>(
                        <Link
                        key= {button.label}
                        to={button.href}
                        className="group relative flex items-center justify-center px-4 py-3.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/15
                        hover:border-white/40 active:scale-95 text-xs sm:text-sm font-semibold tracking-wide transition-all duration-200 text-center backdrop-blur-md cursor-pointer">
                            <span className="text-white group-hover:text-blue-100 transition-colors">{button.label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}