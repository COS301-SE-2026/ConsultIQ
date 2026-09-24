import {  useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiClient } from "../../../lib/api-client";
import type { FeasibilityRequestDto, FeasibilityResponseDto } from "../types/feasibility.types";

export type FeasibilityCheckState =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "forbidden"
  | "rate-limited";

  interface FeasibilityCheckSnapshot {
    state: FeasibilityCheckState;
    requestKey: string | null;
    result: FeasibilityResponseDto | null;
    error: string | null;
  }
  interface UseFeasibilityCheckResult {
    state: FeasibilityCheckState;
    result: FeasibilityResponseDto | null;
    error: string | null;
  }

  export function useFeasibilityCheck (request: FeasibilityRequestDto | null, enabled: boolean, debounceMs = 500): UseFeasibilityCheckResult{

    const [snapshot, setSnapshot] = useState<FeasibilityCheckSnapshot>({
      state: "idle",
      requestKey: null,
      result: null,
      error: null,
    })

    const controllerRef = useRef<AbortController | null>(null);
    const requestIdRef = useRef(0);

    const requestKey = useMemo(() => (request ? JSON.stringify(request) : null), [request]);

    useEffect(() => {
      const requestId = ++requestIdRef.current;

      controllerRef.current?.abort();
      controllerRef.current = null;

      if(!enabled || !requestKey){
        return;
      }

      const timer = window.setTimeout(async () => {
        const controller = new AbortController();
        controllerRef.current = controller;

        let requestPayload: FeasibilityRequestDto;

        try{
          requestPayload = JSON.parse(requestKey) as FeasibilityRequestDto; 
        } catch {
          setSnapshot({
            state: "error",
            requestKey,
            result: null,
            error: "Unable to check feasibility right now."
          });
          return;
        }

        setSnapshot({
          state: "loading",
          requestKey,
          result: null,
          error: null
        });

        void apiClient.post<FeasibilityResponseDto>("/projects/feasibility-check",
          requestPayload, { signal: controller.signal },)
          .then((response) => {
            if(controller.signal.aborted || requestId !== requestIdRef.current){
              return;
            }

          setSnapshot({
            state: "success",
            requestKey,
            result: response,
            error: null
          });
        })
      .catch((cause: unknown) => {
        if(controller.signal.aborted || requestId !== requestIdRef.current){
          return;
        }

        if(cause instanceof ApiError){
          if(cause.status === 403){
            setSnapshot({
              state: "forbidden",
              requestKey,
              result: null,
              error: "You do not have permission to preview this project."
            });
            return;
          }

          if(cause.status === 429){
            setSnapshot({
              state: "rate-limited",
              requestKey,
              result: null,
              error: "Please slow down a little before trying again."
            });
            return;
          }

          setSnapshot({
            state: "error",
            requestKey,
            result: null,
            error: cause.message
          });
          return;
        }

        setSnapshot({
          state: "error",
          requestKey,
          result: null,
          error: "Unable to check feasibility right now."
        });
      });
      }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      //controller.abort();
    };
  }, [debounceMs, enabled, requestKey]);

  const isCurrentRequest = enabled && requestKey !== null && snapshot.requestKey === requestKey;

  if(!isCurrentRequest){
    return {state: enabled && requestKey ? "idle" : "idle", result: null, error: null}
  }

  return { state: snapshot.state, result: snapshot.result, error: snapshot.error };
}