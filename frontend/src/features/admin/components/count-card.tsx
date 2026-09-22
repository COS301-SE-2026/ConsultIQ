import type { LucideIcon } from "lucide-react";

interface CountCardProps {
  readonly title: string;
  readonly count: number | string;
  readonly icon: LucideIcon;
  readonly iconBackgroundColour: string;
  readonly iconColour: string;
}



function CountCard({title , count, icon: Icon, iconBackgroundColour,iconColour }: CountCardProps) {
  

  return (
    <div
      className="flex min-w-0 flex-1 items-center rounded-2xl bg-white px-4 py-5 shadow-sm sm:px-6"
      style={{
        padding: "24px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        minWidth:"240px",
      }}
    >
    
        {/* Icon */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: iconBackgroundColour }}
            >
            <Icon 
                style={{
                    width : "28px",
                    height: "28px",
                    color: iconColour,

                }}
            /> 
        </div>
    

      {/* Title + count */}
      <div 
       className="ml-4 flex min-w-0 flex-col" 
       style={{ marginLeft: "20px", gap: "4px" }}
       >
        <p
          className="truncate font-bold"
          style={{ color: "var(--color-primary)", fontSize: "18px", whiteSpace: "nowrap"}}
        >
          {title} 
        </p>
        <span
           className="font-bold"
          style={{ color: "var(--color-primary)", fontSize: "22px", lineHeight: "1" }}
        >
          {count}
        </span>
      </div>
    </div>
  );
}

export default CountCard;