const PROJECT_COLOURS: Record<string, { color: string; lightColor: string }> = {
    "proj-digital": { color: "#2563EB", lightColor: "#EFF6FF" },
    "proj-cloud": { color: "#0D9488", lightColor: "#F0FDFA" },
    "proj-data": { color: "#7C3AED", lightColor: "#F5F3FF" },
};

const FALLBACK = { color: "#64748B", lightColor: "#F8FAFC" };

export function getProjectColour(projectId: string) {
    return PROJECT_COLOURS[projectId] ?? FALLBACK;
}