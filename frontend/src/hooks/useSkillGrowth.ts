import {  useApiQuery} from "./useApiQuery";
import { getSkillGrowth } from "../features/consultants/services/consultant.service";


export const useSkillGrowth = () => useApiQuery(getSkillGrowth);