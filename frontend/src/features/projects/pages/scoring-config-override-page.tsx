import {  useState } from "react";
import {type ScoringFactor, ScoringWeightsTable } from "../../scoring/components/scoring-weights-table";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { projectManagerSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import {DEFAULT_SEEDED_FACTORS} from "../../scoring/components/mock/scoring-factors";

export default function ProjectScoringOverridePage(){

    const [factors, setFactors] = useState<ScoringFactor[]>(DEFAULT_SEEDED_FACTORS);
    const [isUsingDefaultWeights]= useState(true);
    const [showConfirmationModal, setshowConfirmationModal]= useState(false);


    const handleOverrideSave= async(updatedFactors: ScoringFactor[])=>{
        try{setFactors(updatedFactors);}
        catch(err){console.log('Error saving override weights', err);}
    }
    const handleConfirmRevert= () =>{
    }

    return(
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
        <Sidebar items={projectManagerSidebarItems} />
        <div className="flex-1 flex flex-col">
        <header
          className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
          style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
        >
          <h1 className="text-4xl font-bold" style={{ color: "var(--color-primary)" }}>
            Project Override Scoring
          </h1>
     
        </header>
        <div className="h-6"/>
        <div className="flex-1 flex items-center justify-center px-4 py-8">

        <ScoringWeightsTable initialFactors={factors} isProjectOverride={true} isUsingDefaultWeights={isUsingDefaultWeights} onSave={handleOverrideSave} onRevertToDefaultWeights={() => setshowConfirmationModal(true)}/>
        
        {showConfirmationModal &&(
            <div className="fised inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center animate-fade-in">
                <div className=" bg-white p-6 rounded-lg max-w-md w-full shadow-md border border-slate-100 mx-4">
                    <h3 className="text-sm font-bold">Revert to Consultancy Defaults?</h3>
                    <p>This will remove all scoring algorithm's customization parameters configured. The matching engine will revert to using firm-wide configurations.</p>
                    <div className="mt-5 flex justify-end gap-3">
                        <button onClick={() =>setshowConfirmationModal(false)}
                        className="px-3 py-2 text-sm font-semibold text-slate-500"
                        >Cancel</button>

                        <button onClick={handleConfirmRevert}
                        className="px-3 py-2 text-sm fornt-bold bg-red-600">
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