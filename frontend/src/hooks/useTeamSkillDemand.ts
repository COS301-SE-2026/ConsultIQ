import { useApiQuery } from "./useApiQuery";
import { getTeamSkillDemand } from "../features/consultants/services/consultant.service";

export const useTeamSkillDemand = () => useApiQuery(getTeamSkillDemand);