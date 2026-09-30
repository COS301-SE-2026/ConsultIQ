import { useCallback, useEffect, useState } from "react";
import { getSkillGrowth } from "../features/consultants/services/consultant.service";
import type { SkillGrowthResponse } from "../features/consultants/types/consultant.types";

export function useSkillGrowth(){
    const [data, setData] = useState<SkillGrowthResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError]= useState(false);
    const [reloadKey, setReloadKey]= useState(0);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setIsError(false);

        getSkillGrowth().then((res) => {
            console.log("skill data", res);
            if(!cancelled) setData(res);
        })
        .catch((err) => {
             console.log("skill error ", err);
            if(!cancelled) setIsError(true);
        })
        .finally(() => {
            if(!cancelled) setIsLoading(false);
        });

        return () => {
            cancelled=true;
        };

    },[reloadKey]);

    const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

    return {data, isLoading, isError, refetch};
}