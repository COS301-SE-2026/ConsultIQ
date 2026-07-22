import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import  {UnderConstructionCard}  from "../components/under-construction-card";
import { useAuth } from "../../../hooks/useAuth";
import { useFetchConsultantProfile } from "../../../hooks/useFetchConsultantsProfiles";
import ConsultantProfileViewPage from "./consultant-profile-view";


function UnderConstructionPage() {
  const {user} = useAuth();

  const { profile, isLoading,notFound } = useFetchConsultantProfile(
    undefined,
    user?.userId
  );

  if(isLoading){
    return(
      <div
        className="flex h-screen items-center justify-center font-medium bg-brand-bg! text-brand-blue!"
      >
        Loading profile content
      </div>
    );
  }

  const hasNoProfile= notFound;

  if(hasNoProfile){
     return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={consultantSidebarItems} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="bg-white flex items-center h-[90px] px-[40px] border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h1 className="font-bold text-[32px]" style={{ color: "var(--color-primary)" }}>
            My Profile
          </h1>
        </header>

        {/* Main */}
        <main className="flex-1 flex p-8  items-center justify-center ">
          <UnderConstructionCard />
        </main>
      </div>
    </div>
     );
  }

 return <ConsultantProfileViewPage/>
}

export default UnderConstructionPage;