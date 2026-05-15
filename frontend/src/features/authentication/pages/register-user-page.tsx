import Sidebar from "../../../components/layout/sidebar/sidebar";
import { adminSidebarItems, consultantManagerSidebarItems, consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import UserRegistrationForm from "../components/user-registration-form";
import type { UserRole } from "../../../types/global.types";
import { ArrowLeft } from "lucide-react";

function RegisterUserPage() {
    /* for now, mock user, will be replaced with actual user data from auth context */
    const currentUserRole: UserRole = "ADMIN";
    
    let allowedRoles: UserRole[] = [];
    if (currentUserRole === "ADMIN") {
        allowedRoles = [ "CONSULTANT_MANAGER", "PROJECT_MANAGER"];
    } else if (currentUserRole === "CONSULTANT_MANAGER") {
        allowedRoles = ["CONSULTANT"];
    }

    // Extract sidebar items selection 
    let sidebarItems;
    if (currentUserRole === "ADMIN") {
        sidebarItems = adminSidebarItems;
    } else if (currentUserRole === "CONSULTANT_MANAGER") {
        sidebarItems = consultantManagerSidebarItems;
    } else {
        sidebarItems = consultantSidebarItems;
    }

    return (
        <div
            className=" flex min-h-screen" style={{ backgroundColor:"var(--color-surface)",}}>
            <Sidebar items={sidebarItems} />

            <div
                className="flex-1 flex flex-col" style={{backgroundColor:"var(--color-surface)",}}
            >
                {/*Header */}
                <header
                    className="h-[90px] bg-white border-b flex items-center px-10" style={{borderColor: "var(--color-border)",}}
                >
                <div
                    className="flex items-center gap-5">   
                    <button
                        className="w-[42px] h-[42px] rounded-xl flex items-center justify-center transition hover:opacity-80" bg-white
                        >
                        <ArrowLeft
                        size={20}
                        color=" var(--color-primary)"
                         />
                        </button>
                 <div>
                    <h1 className="text-3x font-bold mb-1" style={{color: "var(--color-primary)",}}>
                        Register User
                    </h1>

                </div>
            </div>  
            </header>
                <main className="flex-1 flex items-center justify-center p-10">
                <UserRegistrationForm allowedRoles={allowedRoles} />
            </main>
        </div>
        </div>
    );

}

export default RegisterUserPage;