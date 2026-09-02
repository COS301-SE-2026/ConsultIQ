import { apiClient } from "../../../lib/api-client";
import type { ProjectSkillGapResponse, PortfolioSkillGapResponse } from "../types/skill-gap.types";

export const getProjectSkillGap = async (projectId: string) =>
    apiClient.get<ProjectSkillGapResponse>(`/projects/${projectId}/skill-gap-analysis`);

export const getPortfolioSkillGap = async () =>
    apiClient.get<PortfolioSkillGapResponse>("/skill-gap-analysis/portfolio")