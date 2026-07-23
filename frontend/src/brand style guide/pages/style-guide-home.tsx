import { Link } from "react-router-dom";
import consultIqLogo from "../../assets/logos/ConsultIQ Logo Dark.png";


interface NavButton{
    readonly label: string;
    readonly href: string; 
}

const NAV_BUTTONS: NavButton[]=[
    {label:"Principles", href: "/pages/principles"},
    {label: "Colors", href: "pages/colors"},
    {label: "Typography", href: "pages/typography"},
    {label: "Icons", href: "pages/icons"},
    {label: "Tone", href: "pages/tone"},
    {label: "Components", href: "pages/components"},
    {label: "Spacing", href: "pages/spacing"},
    {label: "Accessibility", href: "pages/accessibility"},
    {label: "Responsiveness", href: "pages/responsiveness"},
];

export default function StyleGuideHome(){
    return (
        <div className= "relative min-h-screen w-full bg-[#002B5C] text-white flex flex-col justify-between overflow-hidden p-8 md:p-16">
            <div className= "absolute top-0 right-0 w-[190px] h-[30vh] z-10" style={{background: "rgba(52, 84, 132, 0.99)", boxShadow: "0 4px 4px rgba(0,0,0,0.30)"}}/>
            <div className= "absolute right-[190px] bottom-0 w-[190px] h-[70vh] z-10 " style={{background: "rgba(48, 80, 129, 0.99)", boxShadow: "inset 0 4px 4px rgba(0,0,0,0.30)"}}/>

            <div className="relative z-10">
                <div className="flex items-center gap-3">
                    <div className=" p-2.5 rounded-lg  backdrop-blur-md inline-block">
                        <img src={consultIqLogo}
                        alt="ConsultIQ Logo"
                        className="h-30 w-auto object-contain"
                        />
                    </div>
                </div>
            <div className="relative z-10 flex-1 flex items-center max-w-xl -mt-16">
                <h1 className="!text-5xl sm:!text-6xl md:!text-7xl !font-normal tracking-tight !text-white leading-[1.1]">
                    Brand <br />
                    Style <br />
                    Guidelines
                </h1>
            </div>
            </div>

            <div className="relative z-10 w-full max-w-5xl mt-auto">
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