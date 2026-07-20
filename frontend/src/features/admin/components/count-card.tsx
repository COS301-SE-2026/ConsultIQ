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
      className="bg-white rounded-2xl flex-1 flex items-center min-w-60"
      style={{
        padding: "24px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        minWidth:"240px",
      }}
    >
    
        {/* Icon */}
        <div
            className="rounded-full flex items-center justify-center shrink-0"
            style={{
                width : "64px",
                height: "64px",
                borderRadius:"50%",
                minWidth:"64px",
                minHeight:"64px",
                backgroundColor: iconBackgroundColour,
            }}
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
       className="flex flex-col justify-center" 
       style={{ marginLeft: "20px", gap: "4px" }}
       >
        <p
          className="font-bold"
          style={{ color: "var(--color-primary)", fontSize: "18px", whiteSpace: "nowrap"}}
        >
          {title} 
        </p>
        <span
           className="font-bold"
          style={{ color: "var(--color-primary)", fontSize: "30px", lineHeight: "1" }}
        >
          {count}
        </span>
      </div>
    </div>
  );
}

export default CountCard;