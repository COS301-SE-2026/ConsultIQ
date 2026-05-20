import consultIqLogo from "../../../assets/logos/ConsultIQ logo.jpeg";

import type { SidebarItem } from "./sidebar.types";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../../hooks/useAuth";

interface SidebarProps {
  readonly items: SidebarItem[];
}

function Sidebar({ items }: SidebarProps) {
  const [activePath, setActivePath] = useState(items[0].path);
  const { logout } = useAuth();
  return (
    <aside
      style={{
        width: "280px",
        minHeight: "100vh",
        backgroundColor: "var(--color-primary)",

        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Logo Section */}
      <div
        style={{
          backgroundColor: "white",
          height: "150px",

          display: "flex",
          alignItems: "center",
          justifyContent: "center",

        }}
      >
        <img
          src={consultIqLogo}
          alt="ConsultIQ Logo"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            }}
        />
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          padding: "32px 16px",
        }}
      >
        {items.map((item) => {
        const Icon = item.icon;

        return (
            <button
            key={item.path}
            onClick={() => setActivePath(item.path)}
            style={{
                padding: "18px 20px",

                borderRadius: "12px",

                color: "white",

                fontSize: "18px",
                fontWeight: 500,

                cursor: "pointer",

                marginBottom: "12px",

                display: "flex",
                alignItems: "center",
                gap: "14px",
                width: "100%",

                backgroundColor:
                activePath === item.path
                    ? "var(--color-secondary)"
                    : "transparent",

                transition: "0.2s ease",
            }}
            >
            <Icon size={22} />

            {item.label}
            </button>
        );
        })}
      </nav>

      {/* Logout - FIXED: Changed from div to button for standard accessibility */}
      <button
        onClick={logout}
        style={{
            padding: "24px",

            color: "white",

            fontSize: "18px",
            fontWeight: 500,

            border: "none",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            backgroundColor: "transparent",

            cursor: "pointer",

            display: "flex",
            alignItems: "center",
            gap: "14px",
            width: "100%",
            opacity: 0.9,
            
            fontFamily: "inherit",
            textAlign: "left",
        }}
        >
        <LogOut size={22} />

        Logout
      </button>
    </aside>
  );
}

export default Sidebar;