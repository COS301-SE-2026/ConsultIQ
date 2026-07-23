import { useNavigate } from "react-router-dom";
import consultIqLogo from "../../../assets/logos/ConsultIQ logo.jpeg";
import { Button } from "../../../components/ui/button";
import { useState,useRef } from "react";
import { HelpCircle,X,Menu } from "lucide-react";
import HeroLandingPage from "../components/hero"
import PlacementSection from "../components/placement-section";
import ConfigurationSection from "../components/configuration-section";
import ManagementSection from "../components/management-section";
import MechanicsSection from "../components/mechanics-section";

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


function LandingPage(){
    const [mobileOpen, setMobileOpen] = useState(false);
    const helpRef = useRef<HTMLDivElement>(null);
    const navigate= useNavigate();
    

    return(
        <div className="min-h-screen sticky overflow-y-auto overscroll-none  ">
            <header className="absolute  top-0 left-0 w-full z-50 md:sticky md:bg-white md:border-b md:border-[#e2e8f0] md:shadow-sm  ">
                <div className=" px-8  h-16 flex md:grid md:grid-cols-3 items-center justify-between ">
                    <div className="hidden md:flex h-16 items-center justify-self-start">
                        <img
                            src={consultIqLogo}
                            alt="ConsultIQ Logo"
                            className="h-full w-auto object-contain"
                        />
                    </div>
                    <nav className=" hidden md:flex  items-center gap-16 justify-self-center">
                            <a 
                                href="#management"
                                className="text-lg font-semibold  text-brand-muted! hover:text-brand-blue! transition-colors"
                                style={{color: "var(--color-brand-muted)"}}
                            >
                                Features
                            </a>
                            <a 
                                href="#mechanics"
                                className="text-lg font-semibold   text-brand-muted! hover:text-brand-blue! transition-colors"
                            >
                                How it works
                            </a>

                            <a 
                                href="#engine"
                                className="text-lg font-semibold text-brand-muted! hover:text-brand-blue! transition-colors"
                            >
                                Scoring engine
                            </a>  
                            
                    </nav>
                   

                <div className="hidden md:flex items-center  gap-3  justify-self-end">
                        {/* Help dropdown */}
                        <div className="relative" ref={helpRef}>
                            <Button
                                variant="ghost"
                                onClick={()=> navigate("/help")}
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
                            <a 
                                href="#managemet" 
                                onClick={() => setMobileOpen(false)}
                                className="text-base font-semibold text-brand-muted  hover:text-brand-blue! transition-colors"
                            >
                                Features
                            </a>
                            <a 
                                href="#mechanics"
                                onClick={() => setMobileOpen(false)}
                                className="text-base font-semibold text-brand-muted  hover:text-brand-blue! transition-colors"
                            >
                                How it works
                            </a>
                            <a
                                href="#engine"
                                onClick={() => setMobileOpen(false)}
                                className="text-base font-semibold text-brand-muted  hover:text-brand-blue! transition-colors"
                            >
                                Scoring engine
                            </a>
                            <Button
                                variant="ghost"
                                onClick={()=> navigate("/help")}
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

            <main >
               
                {/*Hero*/}
                <section className="flex items-center flex-col relative overflow-hidden bg-brand-blue!">
                    <HeroLandingPage/>
                     
                </section>

                {/*Scoring Engine*/}
                <section id="engine">
                    <section id="placement" >
                        <PlacementSection/>
                    </section>

                    <section id="configuration" className="bg-white py-24" >
                        <ConfigurationSection/>
                    </section>

                    <section id="management">
                        <ManagementSection/>
                    </section>
                </section> 

                <section id="mechanics" className="bg-white py-18 ">
                        <MechanicsSection/>
                </section> 
            </main>
            <footer className="bg-brand-blue py-12 flex flex-col items-center">
                    <p className=" text-xs text-white/40"> &copy; 2026 ConsultIQ, All rights reserved.</p>
            </footer>
        </div>


      


    );

}

export default LandingPage;