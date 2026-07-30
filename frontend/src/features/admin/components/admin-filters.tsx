import { ChevronDown, Shield, CircleDot, ArrowUpDown, } from "lucide-react";

interface AdminFiltersProps {
    readonly activeTab: "Users" | "Projects";
    readonly roleFilter: string;
    readonly statusFilter: string;
    readonly budgetFilter: string;
    readonly onRoleChange: (
        value: string
    ) => void;

    readonly onStatusChange: (
        value: string
    ) => void;

    readonly onBudgetSortChange: (
        value: "asc" | "desc" | ""
    ) => void;
}

export default function AdminFilters({ activeTab, roleFilter, statusFilter, budgetFilter, onBudgetSortChange, onRoleChange, onStatusChange }: AdminFiltersProps) {
    return (
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-8">
            {activeTab === "Users" && (
                <>
                    <div className="relative w-64 flex justify-center items-center">
                        <Shield className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none" size={22} style={{ color: "var(--color-primary)" }} />
                        <select
                            value={roleFilter}
                            onChange={(e) => onRoleChange(e.target.value)}
                            className=" h-12 pr-12  w-full min-w-4 rounded-xl border-(--color-border) bg-white pl-14 py-2 text-sm appearance-none outline-none "
                            style={{
                                paddingLeft : "56px",
                               
                                
                            }}
                        >
                            <option value="">All roles</option>
                            <option value="CONSULTANT">Consultant</option>
                            <option value="ADMIN">Admin</option>
                            <option value="CONSULTANT_MANAGER">Consultant manager</option>
                            <option value="PROJECT_MANAGER">Project manager</option>
                        </select>

                        <ChevronDown
                            className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ color: "var(--color-primary)" }}
                        />
                    </div>

                    <div className="relative  w-64">
                        <CircleDot className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none" size={22} style={{ color: "var(--color-primary)" }} />
                        <select
                            value={statusFilter}
                            onChange={(e) => onStatusChange(e.target.value)}
                            className=" h-12 pr-12  w-full min-w-4 rounded-xl border-(--color-border) bg-white pl-14 py-2 text-sm appearance-none outline-none "
                            style={{
                                paddingLeft : "56px",
                               
                                
                            }}
                        >
                            <option value="">All statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="SUSPENDED">Suspended</option>
                            <option value="PENDING">Pending</option>
                        </select>
                        <ChevronDown
                            className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ color: "var(--color-primary)" }}
                        />
                    </div>

                </>
            )}

            {activeTab === "Projects" && (
                <div className="relative w-64">
                    <ArrowUpDown className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none" size={22} style={{ color: "var(--color-primary)" }} />
                    <select
                        value={budgetFilter}
                        onChange={(e) => onBudgetSortChange(e.target.value as "asc" | "desc" | "")}
                        className=" h-12 pr-12  w-full min-w-4 rounded-xl border-(--color-border) bg-white pl-14 py-2 text-sm appearance-none outline-none "
                         style={{
                                paddingLeft : "56px",
                               
                                
                            }}
                    >
                        <option value="">Sort by budget</option>
                        <option value="desc">Highest to Lowest</option>
                        <option value="asc">Lowest to Highest</option>
                    </select>
                    <ChevronDown
                        className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: "var(--color-primary)" }}
                    />
                </div>
            )}

        </div>
    );
}