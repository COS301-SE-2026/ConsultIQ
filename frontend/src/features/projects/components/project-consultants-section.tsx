
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import type { AssignedConsultants } from "../types/project.types";
import { unassignConsultant } from "../services/project.service";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "../../../hooks/useAuth";

interface ProjectConsultantsProps {
    readonly consultants: AssignedConsultants[];
    readonly projectId: string;
    readonly isLoading: boolean;
    readonly onUnassign: (consultantId: string) => void;
}

const getIntials = (name: string) => {
    if (!name) return "";
    const splitName = name.trim().split(" ").filter(Boolean);
    const first = splitName[0];
    const last = splitName[splitName.length - 1];

    if (!first) return "";
    if (splitName.length === 1) return first[0].toUpperCase();

    return `${first[0]}${last[0]}`.toUpperCase();
}


export default function ProjectConsultants({ consultants, projectId, isLoading, onUnassign }: ProjectConsultantsProps) {
    const { user } = useAuth();
    const isConsultant = user?.role === "CONSULTANT";

    const [unassigned, setUnassigned] = useState<Set<string>>(new Set());

    const handleReassign = async (consultantId: string) => {
        setUnassigned((prev) => new Set(prev).add(consultantId));
        try {
            unassignConsultant(projectId, consultantId);
            onUnassign(consultantId);
        } catch (error) {
            toast.error("Failed to unassign consultant" + error);
        }finally{
            setUnassigned((prev) => {
                const next = new Set(prev);
                next.delete(consultantId);
                return next;
            });
        }

    }

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 4;
    const totalPages = Math.ceil(consultants.length / rowsPerPage);
    const paginatedConsultants = consultants.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    return (
        <Card
            className="w-full bg-white overflow-hidden "
            style={{
                padding: "28px",
                border: " 1px solid #f1f5f9"
            }}
        >

            <h2 className="text-3xl font-bold">Assigned Consultants</h2>

            <div className="w-full ">
                <table className="w-full border-separate border-spacing-y-4 text-left">
                    <thead>
                        <tr className=" bg-[#F5F9FF] h-6  ">
                            <th className="px-8 py-4 font-bold text-[16px]">Name</th>
                            <th className="px-8 py-4 font-bold text-[16px]">Contact</th>
                            <th className="px-8 py-4 font-bold text-[16px]">Skills</th>
                            {!isConsultant && ( <th className="px-8 py-4 font-bold text-[16px]">Actions</th> )}
                        </tr>
                    </thead>


                    <tbody>
                        {!isLoading && paginatedConsultants.map((user) => {
                            const isUnassigned= unassigned.has(user.id);
                            return(
                               <tr key={user.id} className=" hover:bg-slate-50  align-top  ">
                                <td className="flex items-center justify-center gap-4 px-8  text-sm py-4">
                                    <div
                                        className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
                                        style={{
                                            width: "30px",
                                            height: "30px",
                                            minWidth: "30px",
                                            minHeight: "30px",
                                            backgroundColor: "var(--color-primary)",

                                        }}
                                    >
                                        {getIntials(user.fullName)}
                                    </div>

                                    <span className="font-semibold">
                                        {user.fullName}
                                    </span>
                                </td>

                                <td className="px-8 py-4 " >
                                    <div className="flex flex-col text-sm">
                                        <span>
                                            {user.email}
                                        </span>
                                        <span>
                                            {user.phoneNum}
                                        </span>
                                    </div>
                                </td>

                                <td className="px-8 py-4">
                                    <div className="flex flex-wrap gap-2">
                                        {user.skills.map((skill) => (
                                            <span
                                                key={skill}
                                                className="rounded-md border whitespace-nowrap"
                                                style={{
                                                    padding: "5px 14px",
                                                    borderColor: "var(--color-border)",
                                                    color: "var(--color-text-secondary)",
                                                    fontSize: "var(--text-h4)",
                                                }}
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>

                                </td>
                                <td className="px-8 py-4 ">
                                    {!isConsultant && (
                                        <Button
                                            onClick={() => handleReassign(user.id)}
                                            disabled={isUnassigned}
                                            className="px-5 py-2 rounded-md text-white font-semibold text-sm bg-brand-blue hover:bg-red-800"
                                            style={{
                                                color: "white",
                                                fontSize: "16px",
                                                padding: "4px 8px",
                                            }}
                                        >
                                            {isUnassigned ? "Unassigned" : "Unassign"}
                                        </Button>
                                    )}
                                </td>
                            </tr>   
                            );
                          
                        })}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-between items-center mt-2 pt-4 border-t">
                <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80"
                    style={{ color: "var(--color-primary)" }}
                >
                    Previous
                </button>
                <span className="text-sm text-gray-600">
                    Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
                </span>
                <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80"
                    style={{ color: "var(--color-primary)" }}
                >
                    Next
                </button>
            </div>
        </Card>

    );
}