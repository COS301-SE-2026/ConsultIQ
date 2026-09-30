import { useCallback, useEffect, useState } from "react";


export function useApiQuery<T>(fetcher: () => Promise<T>){
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError]= useState(false);
    const [reloadKey, setReloadKey]= useState(0);

    useEffect(() => {
        let cancelled = false;
       

        fetcher().then((res) => {
           
            if(!cancelled){
                setData(res);
                setIsError(false);
            } 
        })
        .catch(() => {
            if(!cancelled) setIsError(true);
        })
        .finally(() => {
            if(!cancelled) setIsLoading(false);
        });

        return () => {
            cancelled=true;
        };

    },[fetcher,reloadKey]);

    const refetch = useCallback(() => {
        setIsLoading(true);
        setIsError(false);
        setReloadKey((k) => k + 1)

    },[]);


    return {data, isLoading, isError, refetch};
}