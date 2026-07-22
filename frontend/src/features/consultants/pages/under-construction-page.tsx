import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import  {UnderConstructionCard}  from "../components/under-construction-card";
import { useAuth } from "../../../hooks/useAuth";
import { useFetchConsultantProfile } from "../../../hooks/useFetchConsultantsProfiles";
import ConsultantProfileViewPage from "./consultant-profile-view";
import useUnreadNotificationCount from "../../../hooks/useUnreadNotificationsCount";


function UnderConstructionPage() {
  const {user} = useAuth();

  const{count: unreadCount} = useUnreadNotificationCount();
 
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

  let hasNoProfile= notFound || !profile ;
  console.log("profile?",hasNoProfile);

  if(user?.role === "CONSULTANT_MANAGER"){
    hasNoProfile = false;
  }
  

  if(hasNoProfile){
     return (
    <div className="flex h-screen overflow-hidden overscroll-none" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={consultantSidebarItems} notificationCount={unreadCount}/>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center pl-5 justify-between w-full"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h1 className="font-bold text-[32px]" style={{ color: "var(--color-primary)" }}>
            My Profile
          </h1>
        </header>

        {/* Main */}
        <main className="flex flex-col flex-1 p-8 overflow-y-auto items-center overscroll-none ">
          <div className="my-auto mx-auto w-full max-w-4xl flex  justify-center">
            <UnderConstructionCard />
          </div>
          
        </main>
      </div>
    </div>
     );
  }

 return <ConsultantProfileViewPage/>
}

export default UnderConstructionPage;