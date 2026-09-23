// import { useEffect, useMemo, useRef, useState } from "react";
// import { ApiError, apiClient } from "../../../lib/api-client";
// import type { FeasibilityRequestDto, FeasibilityResponseDto } from "../types/feasibility.types";

export type FeasibilityCheckState =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "forbidden"
  | "rate-limited";