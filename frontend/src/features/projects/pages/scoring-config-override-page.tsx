import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { type ScoringFactor, ScoringWeightsTable } from "../../scoring/components/scoring-weights-table";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { projectManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import { scoringApiService } from "../../scoring/services/scoring.service";
import { placementService } from "../../scoring/services/placement.service";

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

    useEffect(() => {
        const loadConfigurations = async () => {
            if (!projectId) {
                setErrMessage("No project was selected.");
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

            const rawMatchData = await placementService.executeMatchRun(projectId);
            console.log(`Raw Data: ${JSON.stringify(rawMatchData, null, 2)}`);

            navigate(`/placement-dashboard`, {
                state: { rawMatchData }
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setErrMessage(message || 'Failed to execute match run.');
        } finally {
            setIsMatching(false);
        }

    }

    return (
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-surface)" }}>
            <div className="h-screen shrink-0">
                <Sidebar items={projectManagerSidebarItems} /></div>
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                <header
                    className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
                    style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
                >
                    <span><h1 className="text-4xl font-bold" style={{ color: "var(--color-primary)" }}>
                        Project Override Scoring
                    </h1>
                    <p className="text-lg font-medium text-slate-500 mt-1">Project Name</p></span>


                </header>
                <div className="h-6" />
                <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
                    {errMessage && (
                        <div className="w-full items-center max-w-5xl mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-semibold">
                            {errMessage}
                        </div>
                    )}
                    {successMessage && (
                        <div className="w-full items-center max-w-5xl mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-semibold transition-opacity duration-300">
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
                    )

                    }
                </div>
            </div>
        </div>
    )
}