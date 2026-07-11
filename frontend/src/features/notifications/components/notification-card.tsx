import {formatDistanceToNow} from "date-fns";
import {FolderDot, FolderOpenDot,Archive} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NotificationCardProp {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly createdAt: string;
  readonly link?: string;
  readonly status: "unread" | "read" | "archived";
  readonly checked?: boolean;
  readonly onCheckedChange?: () => void;
}

interface notificationIcon{
    readonly icon:LucideIcon;
    readonly bgColour: string;
    readonly colour: string;
}

const iconStyles ={
    read:{icon: FolderOpenDot, bgColour: "#F1F5F9", colour: "#64748B"},
    unread:{icon: FolderDot,bgColour: "#EDE9FE", colour: "#7C3AED"},
    archived:{icon: Archive , bgColour: "#F1F5F9", colour:"64748B"}
}satisfies Record<NotificationCardProp["status"],notificationIcon>;


function getTime(date: string){
    return formatDistanceToNow(new Date(date),{addSuffix:true});
}



export default function NotificationCard({id,title,body,createdAt,link,status,checked,onCheckedChange}:NotificationCardProp){
    const checkboxId = `notification-${id}`;
    const {icon:Icon,bgColour, colour} = iconStyles[status];

    return(
        <div className="flex gap-4 items-center px-6 py-4 border-b border-slate-100 w-full hover:bg-slate-50/50 transition-colors"
            style={{padding:"5px 24px 5px 20px"}}
        >
            <input 
                type="checkbox" 
                checked= {checked}
                id={checkboxId}
                onChange={onCheckedChange}
                className="w-4 h-4 shrink-0"
                
            />

            <div 
                className="flex items-center justify-center rounded-full shrink-0"
                style={{ width: "36px", height: "36px", backgroundColor: bgColour}}
            > 
                <Icon size={18} style={{color: colour}} />
            </div>

            <label htmlFor={checkboxId}  className="flex-1 min-w-0 cursor-pointer">
                {link ? (
                    <a href={link}>
                        <p className="font-semibold" style={{ color: "var(--color-primary,#002D72)"}}>
                            {title}
                        </p>
                        <p className="text-sm text-slate-500">
                            {body}
                        </p>
                    </a>
                ): (
                    <>
                    <p className="font-semibold" style={{ color: "var(--color-primary,#002D72)"}}>
                        {title}
                    </p>
                        <p className="text-sm text-slate-500" >
                            {body}
                        </p>
                    </>
                )}
               
            </label>
            <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
                 {getTime(createdAt)}
            </span>
            
        </div>
    );
}
