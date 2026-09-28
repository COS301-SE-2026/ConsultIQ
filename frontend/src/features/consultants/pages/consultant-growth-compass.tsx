import { fallbackRecommendations } from "../types/consultant.types"
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import SkillGrowthCard from "../components/skill-growth-card";


export default function GrowthCompass() {
  return (
    <div className="flex h-screen overflow-hidden overscroll-none" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={consultantSidebarItems} />


      <main className="flex-1 overflow-y-auto px-10 py-8">
        <div className="mx-auto max-w-6xl">
          <header>
            <p className="text-sm font-bold uppercase tracking-widest text-[#9A7A2C]">
              Consultant dashboard
            </p>
            <p className="mt-2 text-3xl font-bold text-brand-navy">Your next move</p>
            <p className="mt-2 text-base text-brand-muted">
              A focused recommendation based on your profile and current demand.
            </p>
          </header>
        </div>

        <section className="mt-8">
          <SkillGrowthCard recommendations={fallbackRecommendations} />
        </section>
      </main>

    </div>
  );


}