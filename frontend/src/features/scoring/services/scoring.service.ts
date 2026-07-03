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
    hardExclusion?: boolean;
    weight?: number;
    overrideWeight?: number;
}

function mapToFrontend(backendFactors: BackendFactor[]): ScoringFactor[] {
    return backendFactors.map((f) => ({
        factorName: f.factorName,
        description: f.description || '',
        isActive: f.active,
        hardExclusion: f.hardExclusion || false,
        weight: f.weight ?? 0,
    }));
}



function mapToBackend(frontendFactors: ScoringFactor[]): BackendFactor[] {
    return frontendFactors.map((f) => ({
        factorName: f.factorName,
        weight: f.weight,
        active: f.isActive
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
        return mapToFrontend(data);
    },

    // Update firm wide configurations

    async updateGlobalConfig(factors: ScoringFactor[]): Promise<ScoringFactor[]> {
        const payload = {
            scoringFactors: mapToBackend(factors),
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

}
