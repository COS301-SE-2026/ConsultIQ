export interface ProjectColour {
    color: string;
    lightColor: string;
}

// Fixed colours for the fixture projects
const PROJECT_COLOURS: Record<string, ProjectColour> = {
    "proj-digital": { color: "#2563EB", lightColor: "#EFF6FF" },
    "proj-cloud": { color: "#0D9488", lightColor: "#F0FDFA" },
    "proj-data": { color: "#7C3AED", lightColor: "#F5F3FF" },
};

// Real projects have UUIDs, so pick a colour from the palette based on the id.
// The same id always gets the same colour.
const PALETTE: ProjectColour[] = [
    { color: "#2563EB", lightColor: "#EFF6FF" }, // blue
    { color: "#0D9488", lightColor: "#F0FDFA" }, // teal
    { color: "#7C3AED", lightColor: "#F5F3FF" }, // violet
    { color: "#D97706", lightColor: "#FFFBEB" }, // amber
    { color: "#DB2777", lightColor: "#FDF2F8" }, // pink
    { color: "#059669", lightColor: "#ECFDF5" }, // green
];

function hashId(id: string): number {
    let hash = 0;
    for (const ch of id) {
        hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
    }
    return hash;
}

export function getProjectColour(projectId: string): ProjectColour {
    return PROJECT_COLOURS[projectId] ?? PALETTE[hashId(projectId) % PALETTE.length];
}