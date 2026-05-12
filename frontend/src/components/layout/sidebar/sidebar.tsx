import consultIqLogo from "../../../assets/logos/ConsultIQ logo.jpeg";

import type { SidebarItem } from "./sidebar.types";
import { LogOut } from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  items: SidebarItem[];
}

function Sidebar({ items }: SidebarProps) {
  const [activePath, setActivePath] = useState(items[0].path);

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
          height: "170px",

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
        {items.map((item, _index) => {
        const Icon = item.icon;

        return (
            <div
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

                backgroundColor:
                activePath === item.path
                    ? "var(--color-secondary)"
                    : "transparent",

                transition: "0.2s ease",
            }}
            >
            <Icon size={22} />

            {item.label}
            </div>
        );
        })}
      </nav>

      {/* Logout */}
      <div
        style={{
            padding: "24px",

            color: "white",

            fontSize: "18px",
            fontWeight: 500,

            borderTop:
            "1px solid rgba(255,255,255,0.1)",

            cursor: "pointer",

            display: "flex",
            alignItems: "center",
            gap: "14px",
            opacity: 0.9,
        }}
        >
        <LogOut size={22} />

        Logout
        </div>
    </aside>
  );
}

export default Sidebar;