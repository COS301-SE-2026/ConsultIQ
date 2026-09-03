import { apiClient } from "../../../lib/api-client";

import type {
    OverallUtilisationDto,
    UtilisationBySkillDto,
    BenchCountDto,
    BenchBySkillDto,
    PlacementsBySkillDto,
    CvParsingStatsDto,
} from "../types/admin.types";

export const getOverallUtilisation = async () => {
    return await apiClient.get<OverallUtilisationDto>("/admin/analytics/utilisation");
};

export const getUtilisationBySkillCategory = async () => {
    return await apiClient.get<UtilisationBySkillDto[]>("/admin/analytics/utilisation/by-skill-category");
};

export const getOverallBenchCount = async () => {
    return await apiClient.get<BenchCountDto>("/admin/analytics/bench");
};

export const getBenchBySkillCategory = async () => {
    return await apiClient.get<BenchBySkillDto[]>("/admin/analytics/bench/by-skill-category");
};

export const getPlacementsBySkillCategory = async () => {
    return await apiClient.get<PlacementsBySkillDto[]>("/admin/analytics/placements/by-skill-category");
};

export const getCvParsingStats = async () => {
    return await apiClient.get<CvParsingStatsDto>("/admin/analytics/cv-parsing-stats");
};