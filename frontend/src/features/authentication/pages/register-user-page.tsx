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
        allowedRoles = [ "CONSULTANT_MANAGER", "CONSULTANT"];
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
            style={{
                display: "flex",
                minHeight: "100vh",
                backgroundColor: "var(--color-surface)",
            }}
        >
            <Sidebar items={sidebarItems} />

            <div
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: "var(--color-surface)",
                       
                }}
            >
                {/*Header */}
                <header
                    style={{
                        height: "90px",
                        backgroundColor: "white",
                        borderBottom:"1px solid var(--color-border)",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 40px",
                    }}
                >
                <div
                    style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "18px",
                    }}
                >   
                    <button
                        style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "10px",
                            border: "none",
                            backgroundColor: "var(--color-surface)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                        }}
                        >
                        <ArrowLeft
                        size={20}
                        color=" var(--color-primary)"
                         />
                        </button>
                 <div>
                    <h1 style={{ 
                        fontSize: "32px", 
                        color: "var(--color-primary)",
                        marginBottom: "4px",
                    }}>
                        Register User
                    </h1>

                </div>
            </div>  
            </header>
                <main
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        flex: 1,
                    }}
                >
                <UserRegistrationForm allowedRoles={allowedRoles} />
            </main>
        </div>
        </div>
    );

}

export default RegisterUserPage;