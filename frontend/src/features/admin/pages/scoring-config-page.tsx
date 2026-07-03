import {  useState } from "react";
import {type ScoringFactor, ScoringWeightsTable } from "../../scoring/components/scoring-weights-table";
import Sidebar from "../../../components/layout/sidebar/sidebar";
import { adminSidebarItems } from "../../../components/layout/sidebar/sidebar.config";

const DEFAULT_SEEDED_FACTORS: ScoringFactor[] = [
  {
    factorName: 'Skill Alignment',
    description: 'Measures how well consultant skills match project requirements.',
    weight: 40,
    isActive: true,
    hardExclusion: true,
  },
  {
    factorName: 'Competency Match',
    description: 'Evaluates competency level alignment with project needs.',
    weight: 30,
    isActive: true,
    hardExclusion: true,
  },
  {
    factorName: 'Availability',
    description: 'Considers consultant availability for the project timeline.',
    weight: 15,
    isActive: true,
    hardExclusion: true,
  },
  {
    factorName: 'Cost Fit',
    description: 'Assesses cost/rate fit within project budget.',
    weight: 10,
    isActive: true,
    hardExclusion: true,
  },
  {
    factorName: 'Geographic Feasibility',
    description: 'Measures geographic proximity or relocation feasibility.',
    weight: 5,
    isActive: true,
    hardExclusion: true,
  },
];
export default function AdminScoringConfigPage(){

        const [factors, setFactors] = useState<ScoringFactor[]>(DEFAULT_SEEDED_FACTORS);


    const handleGlobalSave= async(updatedFactors: ScoringFactor[])=>{
        try{setFactors(updatedFactors);}
        catch(err){console.log('Error saving weights', err);}
    }
    return(
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
        <Sidebar items={adminSidebarItems} />
        <div className="flex-1 flex flex-col">
        <header
          className="shrink-0 z-20 bg-white border-b h-[90px] flex items-center justify-between w-full"
          style={{ borderColor: "var(--color-border)", paddingLeft: "80px", paddingRight: "80px" }}
        >
          <h1 className="text-4xl font-bold" style={{ color: "var(--color-primary)" }}>
            Consultancy Scoring Configurations
          </h1>
     
        </header>
        <div className="h-6"/>
        <div className="flex-1 flex items-center justify-center px-4 py-8">

            <ScoringWeightsTable initialFactors={factors} onSave={handleGlobalSave}/>
        </div>
        </div>
        </div>
    )
}