import { LifeBuoy, BarChart2, Upload, Settings } from "lucide-react";
import TutorialSection from "../components/tutorial-section";
import type { LucideIcon } from "lucide-react";
import FaqSection from "../components/faq-section";
import Navbar from "../../../components/shared/nav-bar";
import { Link } from "react-router-dom";
import {
    consultantSidebarItems, consultantManagerSidebarItems,
    projectManagerSidebarItems, adminSidebarItems,
} from "../../../components/layout/sidebar/sidebar.config";
import { useAuth } from "../../../hooks/useAuth";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { useLocation } from "react-router-dom";

interface QnA {
    readonly q: string;
    readonly a: string;
}

export interface FAQItems {
    readonly group: string;
    readonly icon: LucideIcon;
    readonly items: QnA[];
}

const faqGroups: FAQItems[] = [
    {
        group: "Scoring & Recommendations",
        icon: BarChart2,
        items: [
            { q: "How is the fit score calculated?", a: "ConsultIQ weighs five factors — skill alignment, competency level, geographic travel feasibility, cost-to-company vs billing rate, and real-time availability — using your configured weights to produce one score." },
            { q: "Can I adjust the weight of each scoring factor?", a: "Yes. You can configure a consultancy-wide default , and project managers can override individual factor weights per project. Project-level settings always take precedence." },

        ],
    },
    {
        group: "CV Upload & Profiles",
        icon: Upload,
        items: [
            { q: "What CV file formats are supported?", a: "We accept PDF and DOCX. Our AI parser extracts structured data — skills, competency level, location, and availability — automatically from each document." },
            { q: "How accurate is the CV parser?", a: "The parser achieves over 90% accuracy on well-structured CVs. For any field it cannot confidently extract, it flags the profile for manual review so nothing slips through." },

        ],
    },
    {
        group: "Configuration & Projects",
        icon: Settings,
        items: [
            { q: "How do project-level overrides work?", a: "When creating or editing a project, the manager can toggle scoring factors on/off and adjust their weights. These settings override the global default only for that project." },
            { q: "Can multiple managers configure the same project?", a: "Yes. Any team member with Manager or Admin role on a project can update its scoring configuration. Changes take effect immediately and re-rank all recommendations." },
        ],
    },
];

export default function HelpPage() {
    const { user } = useAuth();
    const location = useLocation();

    const fromLanding= location.state?.from === "landing";

    const showSideBar = user && !fromLanding;

    const roleSidebar = {
        CONSULTANT_MANAGER: consultantManagerSidebarItems,
        CONSULTANT: consultantSidebarItems,
        PROJECT_MANAGER: projectManagerSidebarItems,
        ADMIN: adminSidebarItems,
    };

    const sidebarItems = roleSidebar[user?.role as keyof typeof roleSidebar] || adminSidebarItems;
   
    return (
        <div className={`flex h-screen overflow-hidden overscroll-none ${showSideBar ? "" : "flex-col overflow-y-auto"}`}>
                {showSideBar ? (<Sidebar items={sidebarItems} />) : (<Navbar />)}
          
            <div className="flex-1 flex flex-col min-w-0">
                {showSideBar ? (
                    <header
                        className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
                        style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
                    >
                        <h1 className="font-bold" style={{ color: "var(--color-primary)", fontSize: "32px" }}>
                            How can we help?
                        </h1>
                    </header>
                    ): (
                        <header>
                            <section className="relative flex flex-col items-center overflow-hidden py-20 bg-brand-blue mb-5 sm:py-20 sm:mb-10 text-center px-4">
                                <div
                                    className="absolute inset-0 pointer-events-none opacity-20"
                                    style={{
                                        backgroundImage: "radial-gradient(ellipse 55% 70% at 75% 50%, rgba(74,144,217,1) 0%, rgba(0,45,98,0) 65%)",
                                    }}

                                />
                                <div
                                    className="absolute inset-0 pointer-events-none opacity-10"
                                    style={{
                                        backgroundImage: "radial-gradient(ellipse 40% 60% at 20% 80%, rgba(26,91,168,1) 0%, transparent 55%)",
                                    }}

                                />
                                <span className=" inline-flex items-center gap-2 px-3 py-1.5 bg-brand-gold/15 text-brand-gold border border-brand-gold/50 font-medium rounded-full mb-5">
                                    <LifeBuoy size={12} />
                                    Help centre
                                </span>
                                <div className="mb-2">
                                    <span className="text-white text-5xl font-bold">How can we </span><span className="text-brand-gold text-5xl font-bold">help you?</span>
                                </div>
                                <p className="text-white/40 font-bold text-2xl">
                                    Explore tutorials and common questions about consultIQ
                                </p>

                            </section>
                        </header>

                    )}
                        
                        <main className={`w-full max-w-7xl mx-auto mb-8 overflow-y-auto ${showSideBar ? "pt-10 lg:px-16" : "lg:px-8 sm:px-6"}`}>
                            <section id="tutorials">
                                <TutorialSection />
                            </section>

                            <section id="FAQ">
                                <div className="mb-8">
                                    <p className="font-bold text-brand-muted text-2xl tracking-wide mb-1">FAQs</p>
                                    <h2 className="font-bold text-2xl">Frequently asked questions</h2>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    {faqGroups.map((g) => <FaqSection key={g.group} {...g} />)}
                                </div>
                            </section>
                        </main>


                    </div>
                    <p className="text-white/40 font-bold text-2xl">
                        Explore tutorials and common questions about consultIQ
                    </p>
                        
                    </section>
                </header>

                <main className="w-full max-w-7xl mx-auto  lg:px-8 sm:px-6 mb-8">
                    <section id="tutorials">
                        <TutorialSection/>
                     </section> 

                     <section id="FAQ">
                        <div className="mb-8">
                            <p className="font-bold text-brand-muted text-2xl tracking-wide mb-1">FAQs</p>
                            <h2 className="font-bold text-2xl">Frequently asked questions</h2>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {faqGroups.map((g) => <FaqSection key={g.group} {...g}/>)}
                        </div>
                     </section>
                     <section id= "about-us" className="mt-10">
                        <p className="font-bold text-brand-muted text-2xl tracking-wide mb-1">About Us</p>
                        <Link to="/brand-style-home"><h3 className="font-medium text-2xl">ConsultIQ Brand Style Guidelines</h3></Link>


                     </section>
                </main>
               
           
                
        </div>


            );
   
} 
