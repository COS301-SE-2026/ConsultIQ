import TabButton from "./tab-button";

type Tab = "personal" | "experience" | "skills" | "review";

type Props = {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
};

export default function ProfileTabs({ activeTab, setActiveTab }: Props) {
  return (
    <div
      className="relative border-b border-slate-200"
      style={{ backgroundColor: "var(--color-surface, #ffffff)", zIndex: 9999 }}
    >
      <div className="flex items-center gap-12">
        <TabButton
          label="Personal"
          active={activeTab === "personal"}
          onClick={() => setActiveTab("personal")}
        />
        <TabButton
          label="Experience"
          active={activeTab === "experience"}
          onClick={() => setActiveTab("experience")}
        />
        <TabButton
          label="Skills"
          active={activeTab === "skills"}
          onClick={() => setActiveTab("skills")}
        />
        <TabButton
          label="Review"
          active={activeTab === "review"}
          onClick={() => setActiveTab("review")}
        />
      </div>
    </div>
  );
}