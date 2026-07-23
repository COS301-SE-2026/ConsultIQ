import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import Sidebar from "../../../components/layout/sidebar/sidebar";
import {
  consultantSidebarItems,
  consultantManagerSidebarItems
} from "../../../components/layout/sidebar/sidebar.config";
import { useAuth } from "../../../hooks/useAuth";
import  useUnreadNotificationCount  from "../../../hooks/useUnreadNotificationsCount"; 

import { useFetchConsultantProfile, type MappedConsultantProfile } from "../../../hooks/useFetchConsultantsProfiles";

import {
  ProfileHeroCard,
  PersonalInfoCard,
  LocationCard,
  SkillsCard,
  ExperienceCard,
  EducationCard,
} from "../components/profile";
import type { Skill, Experience, Education } from "../components/profile";

export interface Profile {
  id: string;
  fullName: string;
  status: "Available" | "Unavailable";
  email: string;
  phone: string;
  idNumber: string;
  nationality: string;
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  skills: Skill[];
  experience: Experience[];
  education: Education[];
}

interface ConsultantProfileViewPageProps{
  consultantViewProfile?: MappedConsultantProfile;
}

function ConsultantProfileViewPage({consultantViewProfile}:ConsultantProfileViewPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const fromDashboard = location.state?.fromDashboard || false;
  const targetConsultantId = location.state?.selectedConsultantId;

  const shouldFetch= !consultantViewProfile;


  const { profile : fetchedProfile, isLoading, error } = useFetchConsultantProfile(
    shouldFetch ? targetConsultantId :undefined,
    shouldFetch ? user?.userId : undefined
  );

  const profile= consultantViewProfile ?? fetchedProfile;
  const loading = consultantViewProfile ? false: isLoading;

    const{count: unreadCount} = useUnreadNotificationCount();
    console.log("unread",unreadCount);
    

  // Dynamically select the sidebar based on the user's role
  const sidebarItems = user?.role === "CONSULTANT_MANAGER"
    ? consultantManagerSidebarItems
    : consultantSidebarItems;



  const canEdit = fromDashboard && Boolean(targetConsultantId);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-medium" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-primary)" }}>
        Loading profile content...
      </div>
    );
  }

 

  if (!consultantViewProfile &&(error || !profile)) {
    let errorMessage = "profile not found";

    if (error){
      errorMessage = typeof error === "string" ? error :(error.message || "error while loading profile");
    }

    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4" style={{ backgroundColor: "var(--color-surface)" }}>
        <div className="text-red-500 font-semibold text-lg">{errorMessage || "Profile error"}</div>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition">
          Go Back
        </button>
      </div>
    );
  }

  if(!profile){
    return null;
  }
  
  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      {/* Inject the dynamic sidebar here */}
      <Sidebar items={sidebarItems} notificationCount={unreadCount} />

      <div className="flex-1 flex flex-col overflow-y-auto overscroll-none">
        <header
          className="shrink-0 sticky top-0 z-20 bg-white border-b px-10 h-[90px] flex items-center"
          style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
        >
          <div className="flex items-center gap-6 px-4 w-full">
            {fromDashboard && (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 font-semibold transition hover:opacity-70"
                style={{
                  color: "var(--color-primary)",
                  fontSize: "16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <ArrowLeft size={20} /> Back
              </button>
            )}
            <h1 className="font-bold text-4xl" style={{ color: "var(--color-primary)", marginLeft: fromDashboard ? "auto" : "0", marginRight: fromDashboard ? "auto" : "0" }}>
              {fromDashboard ? "Consultant Profile" : "My Profile"}
            </h1>
            {/* Empty div to balance the flexbox if the back button is present */}
            {fromDashboard && <div style={{ width: "70px" }}></div>}
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center p-10 overflow-y-auto overflow-hidden">
          <div className="flex flex-col gap-8 w-full max-w-[1024px]">
            <div className="h-1" />

            <ProfileHeroCard
              fullName={profile.fullName}
              status={profile.status}
              canEdit={canEdit}
                onSave={() => {
                  // API call goes here
                }}
            />

            <PersonalInfoCard
              fullName={profile.fullName}
              email={profile.email}
              phone={profile.phone}
              idNumber={profile.idNumber}
              nationality={profile.nationality}
              canEdit={canEdit}
               onSave={() => {
                // API call goes here
              }}
             
            />

            <LocationCard
              addressLine1={profile.address1}
              addressLine2={profile.address2}
              suburb= {profile.suburb}
              city= {profile.city}
              province={profile.province}
              postalCode={profile.postalCode}
              canEdit={canEdit}
              onSave={() =>{
                
              }}
             
            />

            <ExperienceCard 
              experiences={profile.experience} 
              canEdit={canEdit}
              onSave={()=>{
                // API call goes here
              }}
            />

            <SkillsCard 
              skills={profile.skills}
              canEdit={canEdit}
              onSave={() => {
                // call your API here, then update state
              }}
             />

            <EducationCard 
              educationList={profile.education} 
              canEdit={canEdit}
              onSave={()=>{
                // API call goes here
              }}
            />


          </div>
        </main>
      </div>
    </div>
  );
}

export default ConsultantProfileViewPage;