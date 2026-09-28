import TabButton from "../../../consultants/components/tabs/tab-button";
import type { adminTab } from "../../pages/admin-dashboard-page";

type Props = {
  readonly activeTab: adminTab;
  readonly setActiveTab: (tab: adminTab) => void;
};

export default function AdminTabs({ activeTab, setActiveTab }: Props) {
  return (
    <div
      className="relative border-b border-slate-200"
      style={{ backgroundColor: "var(--color-surface, #ffffff)", zIndex: 9999 }}
    >
      <div className="flex gap-2 overflow-x-auto sm:gap-6 lg:gap-12">
        <TabButton
          label="Users"
          active={activeTab === "Users"}
          onClick={() => setActiveTab("Users")}
        />
        <TabButton
          label="Projects"
          active={activeTab === "Projects"}
          onClick={() => setActiveTab("Projects")}
        />
      </div>
    </div>
  );
}