import {useState, useEffect } from "react"
import { getAssignedProjects } from "../features/consultants/services/consultant.service";
import type { AssignedProjectListItem } from "../features/consultants/services/consultant.service";
import type { Project } from "../features/projects/types/project.types";

const mapListItemToProject = (item: AssignedProjectListItem): Project => ({
    id: item.project.id,
    name: item.project.projectName,
    projectName: item.project.projectName,
    clientName: item.project.clientName,
    description: item.project.description || "",
    teamSize: item.project.teamSize,
    allocation: item.project.allocation,
    budget: undefined,
    startDate: item.project.startDate,
    endDate: item.project.endDate || "",
    status: item.project.status as Project["status"],
    addressLine1: item.project.addressLine1,
    addressLine2: undefined,
    suburb: item.project.suburb ?? undefined,
    city: item.project.city,
    province: item.project.province,
    postalCode: item.project.postalCode,
    location: {
        addressLine1: item.project.addressLine1,
        addressLine2: undefined,
        suburb: item.project.suburb ?? "",
        city: item.project.city,
        province: item.project.province,
        postalCode: item.project.postalCode,
    },
    skills: [],
});

export function useFetchAssignedProject() {
    const [projects, setProject] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAssignedProject = async () => {
            try  {
                setIsLoading(true);
                const rawData = await getAssignedProjects();
                setProject(rawData.map(mapListItemToProject));
                setError(null);
            } catch (err) {
                console.error("Assigned Projects Fetch Hook Error:", err);
                const errorMessage = err instanceof Error ? err.message : "Could not load assigned projects.";
                setError(errorMessage);
            }finally {
                setIsLoading(false);
            }  
        };
        fetchAssignedProject();
    }, []);
    return { projects, isLoading, error };
}