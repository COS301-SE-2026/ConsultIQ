import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { type ScoringFactor, ScoringWeightsTable } from "../../scoring/components/scoring-weights-table";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { projectManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import { scoringApiService } from "../../scoring/services/scoring.service";
import { placementService } from "../../scoring/services/placement.service";
import { getProjectById, type ProjectPlacementContext } from "../../projects/services/project.service";


export default function ProjectScoringOverridePage() {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const [factors, setFactors] = useState<ScoringFactor[]>([]);
    const [isUsingDefaultWeights, setIsUsingDefaultWeights] = useState(true);
    const [showConfirmationModal, setshowConfirmationModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [errMessage, setErrMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isMatching, setIsMatching] = useState(false);
    const [project, setProject] = useState<ProjectPlacementContext | null>(null);


    useEffect(() => {
        const loadConfigurations = async () => {
            if (!projectId) {
                setErrMessage("No project was selected. Go back to the projects page and select a project to configure.");
                navigate("/projects", {replace: true});
                setIsLoading(false);
                return;
            }
            try {
                setIsLoading(true);
                setErrMessage(null);

                const [globalConfigs, projectOverrides] = await Promise.all([
                    scoringApiService.getGlobalConfig(),
                    scoringApiService.getProjectOverrideConfig(projectId),])
                if (projectOverrides && projectOverrides.length > 0) {
                    setFactors(projectOverrides);
                    setIsUsingDefaultWeights(false);
                } else {
                    setFactors(globalConfigs);
                    setIsUsingDefaultWeights(true);
                }
            } catch (err) {
                setErrMessage(err instanceof Error ? err.message : "Unable to load scoring configurations.");
            } finally {
                setIsLoading(false);
            }
        };
        void loadConfigurations();
    }, [projectId, navigate]);

        useEffect(() =>{
            const loadProject = async() =>{
                if(!projectId) return;
    
                try{
                    const projectData= await getProjectById(projectId);
                    setProject(projectData);
                }catch(error){
                    console.error("Failed to load project details", error);
                }
            };
    
            void loadProject();
        }, [projectId]);


    const handleOverrideSave = async (updatedFactors: ScoringFactor[]) => {
        if (!projectId) {
            setErrMessage("No project was selected.");
            return;
        }
        try {
            const savedScoringFactors = await scoringApiService.updateProjectOverride(projectId, updatedFactors);
            setFactors(savedScoringFactors);
            setIsUsingDefaultWeights(false);
            setErrMessage(null);
            setSuccessMessage("Configurations saved successfully!");
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
        } catch (err) {
            setErrMessage(err instanceof Error ? err.message : "Error saving override weights.");
        }
    };

    const handleConfirmRevert = async () => {
        if (!projectId) return;
        try {
            await scoringApiService.deleteProjectOverride(projectId);
            const globalConfigs = await scoringApiService.getGlobalConfig();
            setFactors(globalConfigs);
            setIsUsingDefaultWeights(true);
            setshowConfirmationModal(false);
            setErrMessage(null);
        } catch (err) {
            setErrMessage(err instanceof Error ? err.message : "Failed to revert scoring override.");
        }
    };

    const handleRunMatch = async () => {
        if (!projectId) return;

        try {
            setIsMatching(true);
            setErrMessage(null);

            const response = await placementService.executeMatchRun(projectId);

            const runId = response.runId;

            navigate(`/placement-dashboard/${projectId}/${runId}`, {
                state: { matchRunStatus: response.status }
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setErrMessage(message || 'Failed to execute match run.');
        } finally {
            setIsMatching(false);
        }

    }

    return (
        <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
            <Sidebar items={projectManagerSidebarItems(projectId)} />
            <div className="min-w-0 flex-1 flex min-h-screen flex-col overflow-y-auto">
                <header
                    className="flex min-h-[90px] shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-white pl-16 pr-4 py-4 sm:px-6 lg:px-10"
                    style={{ borderColor: "var(--color-border)"}}
                >
                    <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl" style={{ color: "var(--color-primary)" }}>
                        Project Override Scoring
                    </h1>
                    <span className="min-w-0 text-right">
                        <p className="break-words text-sm font-medium text-slate-500 sm:text-lg">{project?.projectName}
                        </p>
                    </span>

                </header>
                <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
                   <div className = "mx-auto flex w-full max-w-5xl flex-col items-center"> 
                    {errMessage && (
                        <div className="mb-4 w-full rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 sm:p-4">
                            {errMessage}
                        </div>
                    )}
                    {successMessage && (
                        <div className="mb-4 w-full rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700 transition-opacity sm:p-41">
                            {successMessage}
                        </div>)}
                    {isLoading ? (
                        <div className="text-slate-500 font-medium animate-pulse">
                            Loading scoring configuration...
                        </div>
                    ) : (
                        <ScoringWeightsTable initialFactors={factors} isProjectOverride={true} isUsingDefaultWeights={isUsingDefaultWeights} onSave={handleOverrideSave} onRevertToDefaultWeights={() => setshowConfirmationModal(true)}
                            onRunMatch={handleRunMatch} isMatching={isMatching} />
                    )}

                    {showConfirmationModal && (
                        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center backdrop-blur-sm animate-fade-in">
                            <div className=" bg-white p-6 rounded-lg max-w-md w-full shadow-md border border-slate-100 mx-4">
                                <h3 className="text-sm font-bold mb-2">Revert to Consultancy Defaults?</h3>
                                <p className="text-sm text-slate-600 leading-relaxed"
                                >This will remove all scoring algorithm's customization parameters configured. The matching engine will revert to using firm-wide configurations.</p>
                                <div className="mt-5 flex justify-end gap-3">
                                    <button onClick={() => setshowConfirmationModal(false)}
                                        className="px-3 py-2 text-sm font-semibold text-slate-500"
                                    >Cancel</button>

                                    <button
                                        onClick={handleConfirmRevert}
                                        className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center"
                                    >
                                        Confirm Reversion
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    </div>
                </main>
            </div>
        </div>
    )
}