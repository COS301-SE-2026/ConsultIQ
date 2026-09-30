import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import SkillGrowthCard from "../components/skill-growth-card";
import { useSkillGrowth } from "../../../hooks/useSkillGrowth";


export default function GrowthCompass() {
  const {data, isLoading, isError} = useSkillGrowth();
  console.log("skill growth: ",data);
  return (
    <div className="flex h-screen overflow-hidden overscroll-none" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={consultantSidebarItems} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header
          className="shrink-0 z-20 bg-white  border-b min-h-[90px] flex items-center  w-full pl-16 pr-4 sm:px-10"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="mx-auto w-full max-w-6xl">
            <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl" style={{ color: "var(--color-primary)" }}>
              Consultant dashboard
            </h1>
          </div>
        </header>



        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-10">
          <div className="mx-auto max-w-6xl">
            <p className="text-3xl font-bold text-brand-navy">Your next move</p>
            <p className="text-base text-brand-muted">
              A focused recommendation based on your profile and current demand.
            </p>
          </div>

          <section className="mt-8">
            <SkillGrowthCard 
              recommendations={data?.recommendations ?? []}
              eligibleNow={data?.eligibleNow ?? 0}
              pipelineSize={data?.pipelineSize ?? 0}
              isLoading={isLoading && !data}
              isError={isError} 
            />
          </section>
        </main>
      </div>




    </div>
  );


}