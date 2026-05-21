import consultIqLogo from "../../../assets/logos/ConsultIQ logo.jpeg";

import type { SidebarItem } from "./sidebar.types";
import { LogOut, User } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

interface SidebarProps {
  readonly items: SidebarItem[];
}

function Sidebar({ items }: SidebarProps) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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
          padding: "32px 0",
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                padding: "14px 24px",

                color: "white",

                fontSize: "18px",
                fontWeight: 500,

                cursor: "pointer",

                marginBottom: "12px",

                display: "flex",
                alignItems: "center",
                gap: "14px",
                width: "100%",

                border: "none",
                borderLeft:
                  location.pathname === item.path || location.pathname.startsWith(item.path + "/")
                    ? "4px solid var(--color-accent)"
                    : "4px solid transparent",

                backgroundColor:
                  location.pathname === item.path || location.pathname.startsWith(item.path + "/")
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

      {/* Account Section */}
      {user && (
        <div
          style={{
            padding: "20px 24px 12px 24px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            color: "white",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <User size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.email}
            </div>
            <div
              style={{
                fontSize: "14px",
                opacity: 0.7,
                marginTop: "4px",
                textTransform: "capitalize",
              }}
            >
              {user.role?.replace(/_/g, " ").toLowerCase()}
            </div>
          </div>
        </div>
      )}

      {/* Logout - FIXED: Changed from div to button for standard accessibility */}
      <button
        onClick={logout}
        style={{
          padding: user ? "12px 24px 24px 24px" : "24px",

          color: "white",

          fontSize: "18px",
          fontWeight: 500,

          border: "none",
          borderTop: user ? "none" : "1px solid rgba(255,255,255,0.1)",
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