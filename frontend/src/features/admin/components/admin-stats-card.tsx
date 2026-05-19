import type{ LucideIcon } from "lucide-react";
import { Card } from "../../../components/ui/card";

interface AdminStatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
}

export default function AdminStatsCard({
  title,
  value,
  icon: Icon,
}: Readonly<AdminStatsCardProps>) {
  return (
    <Card className="p-6 rounded-2xl flex items-center gap-5">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          backgroundColor:
            "rgba(0, 45, 98, 0.08)",
        }}
      >
        <Icon
          size={28}
          style={{
            color: "var(--color-primary)",
          }}
        />
      </div>

      <div>
        <p
          className="text-sm font-medium"
          style={{
            color:
              "var(--color-text-secondary)",
          }}
        >
          {title}
        </p>

        <h2
          className="text-3xl font-bold"
          style={{
            color: "var(--color-primary)",
          }}
        >
          {value}
        </h2>
      </div>
    </Card>
  );
}