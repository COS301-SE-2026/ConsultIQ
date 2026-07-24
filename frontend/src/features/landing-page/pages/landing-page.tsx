import Navbar from "../../../components/shared/nav-bar";
import HeroLandingPage from "../components/hero"
import PlacementSection from "../components/placement-section";
import ConfigurationSection from "../components/configuration-section";
import ManagementSection from "../components/management-section";
import MechanicsSection from "../components/mechanics-section";


function LandingPage(){
    return(
        <div className="min-h-screen sticky overflow-y-auto   ">
   
            <Navbar/>
            <main className="overflow-hidden">
               
                {/*Hero*/}
                <section id="hero" className="flex items-center flex-col relative overflow-hidden bg-brand-blue!">
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