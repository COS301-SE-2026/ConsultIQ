import Sidebar from "../../../components/layout/sidebar/sidebar";
import { consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import  {UnderConstructionCard}  from "../components/under-construction-card";

//redirect to ConsultantProfileViewPage when profile is complete

/* 
   const [profile, setProfile] = useState<ConsultantProfile | null>(null);
   useEffect(() => {
    replace with real API call to fetch profile by ID
   }; 
*/




function ConsultantProfilePage() {
 
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
        <main className="flex-1 flex items-center justify-center ">
          <UnderConstructionCard />
        </main>
      </div>
    </div>
  );
}

export default ConsultantProfilePage;