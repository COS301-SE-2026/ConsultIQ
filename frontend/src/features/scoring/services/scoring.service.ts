import type { ScoringFactor } from "../components/scoring-weights-table";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const SCORING_ENDPOINT = `${API_BASE_URL}/config/scoring`;

const getHeaders = () => {

    const token = sessionStorage.getItem("ciq_access_token");
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
};

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

function mapToProjectOverrideBackend(frontendFactors: ScoringFactor[]): Array<{ factorName: string; overrideWeight: number; active: boolean }> {
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
        const res = await fetch(SCORING_ENDPOINT, {
            method: "GET",
            headers: getHeaders(),
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch default firm wide configurations: ${res.statusText}`);
        }

        const data: BackendFactor[] = await res.json();
        // console.log(data);
        return mapToFrontend(data);
    },

    // Update firm wide configurations

    async updateGlobalConfig(factors: ScoringFactor[]): Promise<ScoringFactor[]> {
        const payload = {
            scoringFactors: mapToGlobalBackend(factors),
        };

        const res = await fetch(SCORING_ENDPOINT, {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || "Failed to update global configurations");
        }
        const data: BackendFactor[] = await res.json();
        return mapToFrontend(data);
    },

    async getProjectOverrideConfig(projectId: string): Promise<ScoringFactor[]> {
        const resp = await fetch(`${SCORING_ENDPOINT}/${projectId}/scoring-override`, {
            method: "GET",
            headers: getHeaders(),
        });
        if (!resp.ok) {
            if (resp.status === 404) {
                return [];
            }
            throw new Error(`Failed to fetch project override configurations: ${resp.statusText}`);
        }
        const data = await resp.json();
        console.log("Project override configs", data);
        return mapToFrontend(data);
    },

    async updateProjectOverride(projectId: string, factors: ScoringFactor[]): Promise<ScoringFactor[]> {
        const payload = {
            factors: mapToProjectOverrideBackend(factors),
        };
        const resp = await fetch(`${SCORING_ENDPOINT}/${projectId}/scoring-override`, {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });
        if (!resp.ok) {
            throw new Error("Failed to update project scoring override");
        }
        const data: BackendFactor[] = await resp.json();
        return mapToFrontend(data);
    },

    async deleteProjectOverride(projectId: string): Promise<void> {
        const resp = await fetch(`${SCORING_ENDPOINT}/${projectId}/scoring-override`, {
            method: "DELETE",
            headers: getHeaders(),
            body: JSON.stringify({ confirm: true }),
        });
        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.message || "Failed to delete project scoring override");
        }
    }
}
