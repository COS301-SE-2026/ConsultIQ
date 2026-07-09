import TabButton from "../../consultants/components/tabs/tab-button";
import type { notificationTab } from "../pages/notifications-page";

type Props = {
  readonly activeTab: notificationTab;
  readonly setActiveTab: (tab: notificationTab) => void;
  readonly counts?:{
    all?: number;
    unread?: number;
    archived?: number;
  };
};

function CountBadge({count}: {count: number}){
  return(
      <div
            className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
            style={{
              width: "18px",
              height: "18px",
              backgroundColor: "var(--color-primary)",
              fontSize: "12px",
            }}
          >
            {count}
      </div>
  );
}

export default function notificationTabs({ activeTab, setActiveTab,counts }: Props) {
  return (
    <div
      className="relative border-b border-slate-200"
      style={{ backgroundColor: "var(--color-surface, #ffffff)", zIndex: 9999 }}
    >
      <div className="flex items-center justify-center gap-36" style={{backgroundColor: "#ffffff", paddingLeft:"36px",paddingRight:"36px"}}>

        <div className="flex items-center gap-2">
          <TabButton
            label="All"
            active={activeTab === "All"}
            onClick={() => setActiveTab("All")}
          />

          <CountBadge count={counts?.all ?? 0}/>
        </div>

        <div className="flex items-center gap-2">
           <TabButton
            label="Unread"
            active={activeTab === "Unread"}
            onClick={() => setActiveTab("Unread")}
          />
          <CountBadge count={counts?.unread ?? 0}/>
        </div>

        <div className="flex items-center gap-2">
           <TabButton
            label="Archived"
            active={activeTab === "Archived"}
            onClick={() => setActiveTab("Archived")}
          />
          <CountBadge count={counts?.archived ?? 0}/>
        </div>
       
        
      </div>
    </div>
  );
}