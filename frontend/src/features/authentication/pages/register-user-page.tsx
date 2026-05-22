import Sidebar from "../../../components/layout/sidebar/sidebar";
import { adminSidebarItems, consultantManagerSidebarItems, consultantSidebarItems } from "../../../components/layout/sidebar/sidebar.config";
import UserRegistrationForm from "../components/user-registration-form";
import type { UserRole } from "../../../types/global.types";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

function RegisterUserPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserRole = user?.role as UserRole | undefined;

  // Wait for auth context to load before rendering the form
  if (!currentUserRole) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <p style={{ color: "var(--color-text-secondary)" }}>Loading...</p>
      </div>
    );
  }

  let allowedRoles: UserRole[] = [];
  if (currentUserRole === "ADMIN") {
    allowedRoles = ["CONSULTANT_MANAGER", "PROJECT_MANAGER"];
  } else if (currentUserRole === "CONSULTANT_MANAGER") {
    allowedRoles = ["CONSULTANT"];
  }

  let sidebarItems;
  if (currentUserRole === "ADMIN") {
    sidebarItems = adminSidebarItems;
  } else if (currentUserRole === "CONSULTANT_MANAGER") {
    sidebarItems = consultantManagerSidebarItems;
  } else {
    sidebarItems = consultantSidebarItems;
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <Sidebar items={sidebarItems} />

      <div className="flex-1 flex flex-col" style={{ backgroundColor: "var(--color-surface)" }}>
        <header
          className="h-[90px] bg-white border-b flex items-center px-10"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-5">
            <button
              onClick={() => navigate(-1)}
              className="w-[42px] h-[42px] rounded-xl flex items-center justify-center bg-white transition hover:opacity-80"
            >
              <ArrowLeft size={20} color="var(--color-primary)" />
            </button>
            <div>
              <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--color-primary)" }}>
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