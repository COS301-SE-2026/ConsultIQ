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
      
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header
          className="flex min-h-[90px] shrink-0 flex-wrap items-center justify-between gap-4 border-b bg-white pl-16 pr-4 py-4 sm:px-6 lg:px-10"
          style={{ borderColor: "var(--color-border)"}}
          >
          <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl" style={{ color: "var(--color-primary)" }}>
            Consultancy Scoring Configurations
          </h1>

        </header>
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
            {error && (
              <div className="mb-4 w-full rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 sm:p-4">
                Error: {error}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 w-full rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700 transition-opacity sm:p-41">
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
      </div>
    </div>
  )
}