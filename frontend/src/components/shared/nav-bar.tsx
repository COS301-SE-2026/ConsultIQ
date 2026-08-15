import consultIqLogo from "../../assets/logos/ConsultIQ logo.jpeg";
import { Button } from "../../components/ui/button";
import { useState,useRef } from "react";
import { HelpCircle,X,Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NavHashLink } from "react-router-hash-link";

export interface ButtonProps {
  title: string;
  onClick: () => void;
}


export  function BlueOutlineButton({title,onClick}:ButtonProps){
   
    return(
        <button
            onClick={onClick}
            className="font-semibold text-base px-6 py-2.5 rounded-lg border border-brand-blue! bg-white text-brand-blue! transition-colors hover:bg-white/40! "
            style={{   border: "1px solid #002D62"}}
        >
            {title}
        </button>

    );
}

function BlueButton({title,onClick}:ButtonProps){
    return(
        <button
            onClick={onClick}
            className="font-semibold px-6 py-2.5 rounded-xl bg-brand-blue! text-white transition-colors hover:bg-brand-navy!"
        >
            {title}
        </button>
    );
}

export default function Navbar(){
     const [mobileOpen, setMobileOpen] = useState(false);
    const helpRef = useRef<HTMLDivElement>(null);
    const navigate= useNavigate();

    return(
        <header className="fixed  top-0 left-0 w-full z-50 md:sticky md:bg-white md:border-b md:border-[#e2e8f0] md:shadow-sm  ">
                <div className=" px-8  h-16 flex md:grid md:grid-cols-3 items-center justify-between ">
                    <div className="hidden md:flex h-16 items-center justify-self-start">
                         <NavHashLink
                                smooth
                                to="/#hero"
                                className="h-full w-auto object-contain"
                        >
                        <img
                            src={consultIqLogo}
                            alt="ConsultIQ Logo"
                            className="h-full w-auto object-contain"
                        />
                        </NavHashLink>
                    </div>
                    <nav className=" hidden md:flex  items-center gap-16 justify-self-center">
                            <NavHashLink
                                smooth
                                to="/#management"
                                className="text-lg font-semibold  text-brand-muted! hover:text-brand-blue! transition-colors"
                                style={{color: "var(--color-brand-muted)"}}
                            >
                                Features
                            </NavHashLink>
                            <NavHashLink
                                smooth
                                to="/#mechanics"
                                className="text-lg font-semibold   text-brand-muted! hover:text-brand-blue! transition-colors"
                            >
                                How it works
                            </NavHashLink>

                            <NavHashLink
                                smooth
                                to="/#engine"
                                className="text-lg font-semibold text-brand-muted! hover:text-brand-blue! transition-colors"
                            >
                                Scoring engine
                            </NavHashLink>  
                            
                    </nav>
                   

                <div className="hidden md:flex items-center  gap-3  justify-self-end">
                        {/* Help dropdown */}
                        <div className="relative" ref={helpRef}>
                            <Button
                                variant="ghost"
                                onClick={()=> navigate("/help-page",{state:{from:"landing"}})}
                                className="gap-1.5 px-3 py-2 font-semibold text-brand-muted! hover:text-brand-blue!"
                            >
                                <HelpCircle size={16}/>
                                Help
                            </Button>

                        </div>

                        <BlueButton title={"Log in"} onClick={()=> navigate("/login")}/>
                </div>
                    <button
                        className="md:hidden p-2 ml-auto"
                        onClick={() => setMobileOpen((open) => !open)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X size={22} className="text-white"/> : <Menu size={22} className="text-white"/>}
                    </button>
                </div>
                    

                    {mobileOpen && (
                        <div className="md:hidden flex flex-col gap-4 border-b border-brand-slate bg-white shadow-sm px-8 py-4">
                            <NavHashLink
                                smooth
                                to="/#managemet" 
                                onClick={() => setMobileOpen(false)}
                                className="text-base font-semibold text-brand-muted  hover:text-brand-blue! transition-colors"
                            >
                                Features
                            </NavHashLink>
                            <NavHashLink
                                smooth
                                to="/#mechanics"
                                onClick={() => setMobileOpen(false)}
                                className="text-base font-semibold text-brand-muted  hover:text-brand-blue! transition-colors"
                            >
                                How it works
                            </NavHashLink>
                            <NavHashLink
                                smooth
                                to="/#engine"
                                onClick={() => setMobileOpen(false)}
                                className="text-base font-semibold text-brand-muted  hover:text-brand-blue! transition-colors"
                            >
                                Scoring engine
                            </NavHashLink>
                            <Button
                                variant="ghost"
                                onClick={()=> navigate("/help-page")}
                                className="gap-1.5 px-0 justify-start font-semibold text-brand-muted! hover:text-brand-blue!"
                                style={{}}
                            >
                                <HelpCircle size={16}/>
                                Help
                            </Button>
                            <BlueButton title={"Log in"} onClick={() => navigate("/login")}/>
                        </div>
                    )}
            </header>

    );
}