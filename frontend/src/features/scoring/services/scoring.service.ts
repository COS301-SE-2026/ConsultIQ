import type { ScoringFactor } from "../components/scoring-weights-table";
import { apiClient } from "../../../lib/api-client";

const SCORING_ENDPOINT = `/config/scoring`;


//Backend scoring table 
interface BackendFactor {
    id?: string;
    factorName: string;
    active: boolean;
    description?: string;
    hardExclusionEnabled?: boolean;
    weight?: number;
    overrideWeight?: number;
}

const FACTOR_METADATA: Record<string, { label: string; description: string }> = {
    SKILL_ALIGNMENT: { label: "Skill Alignment", description: "Measures how well consultant skills match project requirements.", },
    COMPETENCY_LEVEL: { label: "Competency level", description: "Evaluates competency level alignment with project needs", },
    AVAILABILITY: { label: "Availability", description: "Considers consultant availability for the project timeline", },
    LOCATION: { label: "Location", description: "Measures geographic proximity or relocation feasibility", },
    COST_TO_COMPANY: { label: "Cost to Company", description: "Assesses cost/rate fit within project budget", },
};

function mapToFrontend(backendFactors: BackendFactor[]): ScoringFactor[] {
    return backendFactors.map((f) => {
        const meta = FACTOR_METADATA[f.factorName] ??
            { label: f.factorName.replaceAll("_", " ").toLowerCase(), description: "No description available.", };
        const effectiveWeight = f.overrideWeight ?? f.weight ?? 0;

        return {
            factorName: meta.label,
            description: meta.description,
            isActive: f.active,
            hardExclusion: f.hardExclusionEnabled || false,
            weight: effectiveWeight,
            factorKey: f.factorName
        }
    });
}



function mapToGlobalBackend(frontendFactors: ScoringFactor[]): BackendFactor[] {
    return frontendFactors.map((f) => ({
        factorName: f.factorKey ?? f.factorName,
        weight: f.weight,
        active: f.isActive,
        hardExclusionEnabled: f.hardExclusion
    }));
}

function mapToProjectOverrideBackend(frontendFactors: ScoringFactor[]): Array<{ factorName: string; overrideWeight: number; active: boolean; hardExclusionEnabled: boolean }> {
    return frontendFactors.map((f) => ({
        factorName: f.factorKey ?? f.factorName,
        overrideWeight: f.weight,
        active: f.isActive,
        hardExclusionEnabled: f.hardExclusion
    }));
}

export const scoringApiService = {
    //firm wide configurations

    async getGlobalConfig(): Promise<ScoringFactor[]> {
        const data= await apiClient.get<BackendFactor[]>(SCORING_ENDPOINT);

        return mapToFrontend(data);
    },

    // Update firm wide configurations

    async updateGlobalConfig(factors: ScoringFactor[]): Promise<ScoringFactor[]> {
        const payload = {
            scoringFactors: mapToGlobalBackend(factors),
        };

        const data= await apiClient.put<BackendFactor[]>(SCORING_ENDPOINT, payload);
        return mapToFrontend(data);
    },

    async getProjectOverrideConfig(projectId: string): Promise<ScoringFactor[]>{
        try{
            const data= await apiClient.get<BackendFactor[]>(
                `${SCORING_ENDPOINT}/${projectId}/scoring-override`);
                return mapToFrontend(data);
        }catch(error){
            if(error instanceof Error && error.message.includes("404")){
                return [];
            }
            throw error;
        }
    },

    async updateProjectOverride(projectId: string, factors: ScoringFactor[]): Promise<ScoringFactor[]>{
        const payload= {
            factors: mapToProjectOverrideBackend(factors),};
        const data= await apiClient.put<BackendFactor[]>(
            `${SCORING_ENDPOINT}/${projectId}/scoring-override`, payload);
            return mapToFrontend(data);
        },

    async deleteProjectOverride(projectId: string): Promise<void>{
        await apiClient.delete<void>(`${SCORING_ENDPOINT}/${projectId}/scoring-override`,
        {body: JSON.stringify({confirm: true}),
        });
    }
}
