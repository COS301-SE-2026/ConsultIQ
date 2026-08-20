import { useEffect, useState } from "react";
import { type ScoringFactor, ScoringWeightsTable } from "../../scoring/components/scoring-weights-table";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { adminSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import { scoringApiService } from "../../scoring/services/scoring.service";
import useUnreadNotificationCount from "../../../hooks/useUnreadNotificationsCount";


export default function AdminScoringConfigPage() {

  const [factors, setFactors] = useState<ScoringFactor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

const{count: unreadCount} = useUnreadNotificationCount();

  // Fetch default configurations
  useEffect(() => {
    let mount = true;

    scoringApiService.getGlobalConfig()
      .then((data) => {
        if (mount) {
          setFactors(data);
          setLoading(false);

        }
      })
      .catch((err) => {
        if (mount) {
          setError(err.message || "Failed to load scoring engine weights");
          setLoading(false);
        }
      });
    return () => {
      mount = false;

    };
  }, []);

  const handleGlobalSave = async (updatedFactors: ScoringFactor[]) => {
    try {
      setError(null);
      setSuccessMessage(null);
      const savedData = await scoringApiService.updateGlobalConfig(updatedFactors);


      setFactors(savedData);
      setSuccessMessage("Configurations saved successfully!");
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    }
    catch (err: unknown) {
      console.log('Error saving weights', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Could not save configuration changes");
      throw err;
    }
  }
  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
       <div className="h-screen shrink-0">
          <Sidebar items={adminSidebarItems} notificationCount={unreadCount}/>
       </div>
      
      <div className="flex-1 flex flex-col ">
        <header
          className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
          style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
        >
          <h1 className="text-4xl font-bold" style={{ color: "var(--color-primary)" }}>
            Consultancy Scoring Configurations
          </h1>

        </header>
        <main className="overflow-hidden overflow-y-auto">
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
            {error && (
              <div className="w-full h-8 items-center bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-semibold">
                Error: {error}
              </div>
            )}

            {successMessage && (
              <div className="w-full h-8 items-center max-w-5xl mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-semibold transition-opacity duration-300">
                {successMessage}
              </div>
            )}

            {loading ? (
              <div className="text-slate-500 font-medium animate-pulse">
                Retrieving live calculation rules from backend...
              </div>
            ) : (
              <ScoringWeightsTable initialFactors={factors} onSave={handleGlobalSave} />
            )}
          </div>
        </main>
       
      </div>
    </div>
  )
}