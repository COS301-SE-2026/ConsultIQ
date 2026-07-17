import { useNavigate } from "react-router-dom";
import consultIqLogo from "../../../assets/logos/ConsultIQ logo.jpeg";
import HelpDropdown from "../components/help-dropdown";
import { Button } from "../../../components/ui/button";
import { useState,useRef, useEffect } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import HeroLandingPage from "../components/hero"
import PlacementSection from "../components/placement-section";

interface ButtonProps {
  title: string;
  onClick: () => void;
}



function BlueOutlineButton({title,onClick}:ButtonProps){
   
    return(
        <button
            onClick={onClick}
            className="font-semibold px-6 py-2.5 rounded-xl border border-brand-blue! bg-white text-brand-blue! transition-colors hover:bg-brand-bg! "
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
    const [helpOpen,setHelpOpen] = useState(false);
    const helpRef = useRef<HTMLDivElement>(null);
    const navigate= useNavigate();
    

    useEffect(() =>{
        function handleClickOutside(event: MouseEvent ){
            if(helpRef.current && !helpRef.current.contains(event.target as Node)){
                 setHelpOpen(false);
            }
        }

        document.addEventListener("mousedown",handleClickOutside);
        return () => {
            document.removeEventListener("mousedown",handleClickOutside);
        };
    },[helpRef]);

    return(
        <div className="min-h-screen sticky  ">
            <header className="sticky top-0 z-50 bg-white border-b border-[#e2e8f0] shadow-sm  ">
                <div className=" px-8  h-16 grid grid-cols-3 items-center ">
                    <div className="flex h-16 items-center justify-self-start">
                        <img
                            src={consultIqLogo}
                            alt="ConsultIQ Logo"
                            className="h-full w-auto object-contain"
                        />
                    </div>
                    <nav className=" flex  items-center gap-16 justify-self-center">
                            <a 
                                href="#features"
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
                   

                <div className=" flex items-center  gap-3  justify-self-end">
                        {/* Help dropdown */}
                        <div className="relative" ref={helpRef}>
                            <Button
                                variant="ghost"
                                onClick={()=> setHelpOpen(!helpOpen)}
                                className="gap-1.5 px-3 py-2 font-semibold text-brand-muted! hover:text-brand-blue!"
                                style={{}}
                            >
                                <HelpCircle size={16}/>
                                Help
                                <ChevronDown
                                    size={14}
                                    className={`transition-transform ${helpOpen ? "rotate-180": ""}`}
                                />
                            </Button>

                            {helpOpen &&(
                                <HelpDropdown/>
                            )}
                        </div>

                        <BlueOutlineButton title={"Log in"} onClick={()=> navigate("/login")}/>

                        <BlueButton title={"Get Started"} onClick={()=> navigate("/login")}/>


                    </div>
                </div>
            
            </header>

            <main>
                {/*Hero*/}
                <section className="relative overflow-hidden !bg-brand-blue">
                    <HeroLandingPage/>
                </section>

                {/*Scoring Engine*/}
                <section id="engine">
                    <section id="placement" >
                        <PlacementSection/>
                    </section>
                </section>  
            </main>
        </div>


      


    );

}

export default LandingPage;