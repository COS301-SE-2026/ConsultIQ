import { useCallback, useEffect, useState } from "react";
import { getTeamSkillDemand } from "../features/consultants/services/consultant.service";
import { type TeamSkillDemandResponse } from "../features/consultants/types/consultant.types";

export function useTeamSkillDemand() {
    const [data, setData] = useState<TeamSkillDemandResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setIsError(false);

        getTeamSkillDemand().then((res) => {
            if (!cancelled) setData(res);
            setIsError(false);
        })
            .catch(() => {
                if (!cancelled) setIsError(true);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };

    }, [reloadKey]);

    const refetch = useCallback(() => {
        setIsLoading(true);
        setIsError(false);
        setReloadKey((k) => k + 1)

    }, []);

    return { data, isLoading, isError, refetch };
}

