import  {fallbackRecommendations} from "../types/consultant.types"
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import SkillGrowthCard from "../components/skill-growth-card";


export default function GrowthCompass(){
    return(
        <div className="flex h-screen overflow-hidden overscroll-none" style={{ backgroundColor: "var(--color-surface)" }}>
            <Sidebar items={consultantSidebarItems} />
            <div className="mt-6">
          <p className="text-sm font-bold uppercase tracking-widest text-gold-dark">
            Consultant dashboard
          </p>
          <p className="mt-2 text-3xl font-bold text-navy">Your next move</p>
          <p className="mt-2 text-muted">
            A focused recommendation based on your profile and current demand.
          </p>
        </div>
        <SkillGrowthCard recommendations={fallbackRecommendations}/>

        </div>
    );


}