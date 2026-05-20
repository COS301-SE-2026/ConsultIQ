import { useState } from "react";
import { Card } from "../../../components/ui/card";
import ProjectSkillsTable from "./project-skills-table";
import type { ProjectSkillData } from "../pages/project-specification-page";

interface ProjectSkillsCardProps {
  skills: ProjectSkillData[];
  onSkillsChange: (skills: ProjectSkillData[]) => void;
}

export default function ProjectSkillsCard({ skills, onSkillsChange }: ProjectSkillsCardProps) {

  const [skillName, setSkillName] = useState("");
  const [competency, setCompetency] = useState("INTERMEDIATE");
  const [years, setYears] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);

  const handleAddSkill = () => {
    if (!skillName.trim() || !years) return;


    onSkillsChange([
      ...skills,
      {
        name: skillName.trim(),
        competency,
        years: Number(years),
        mandatory: isMandatory,
      },
    ]);

    // Reset form fields
    setSkillName("");
    setCompetency("INTERMEDIATE");
    setYears("");
    setIsMandatory(false);
  };

  return (
    <Card className="p-12 h-full w-full flex items-start justify-center">
      <div className="w-full max-w-[440px] flex flex-col h-full">
        <div className="h-6" />

        <h2 className="text-3xl font-bold mb-8" style={{ color: "var(--color-primary)" }}>
          Add Skills
        </h2>

        <div className="h-6" />

        <div className="flex flex-col gap-6 flex-1">
          <div className="flex flex-col gap-3">
            <label htmlFor="skillName" className="text-base font-semibold">
              Skill Name
            </label>
            <input
              type="text"
              id="skillName"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              className="h-14 rounded border px-4 outline-none"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="competency" className="text-base font-semibold">
              Competency
            </label>
            <select
              id="competency"
              value={competency}
              onChange={(e) => setCompetency(e.target.value)}
              className="h-14 rounded border px-4 outline-none"
            >
              <option>BEGINNER</option>
              <option>INTERMEDIATE</option>
              <option>EXPERT</option>
            </select>
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="years" className="text-base font-semibold">
              Years of Experience
            </label>
            <input
              id="years"
              type="number"
              placeholder="Years of experience"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              className="h-14 rounded border px-4 outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsMandatory(!isMandatory)}
              className={`relative w-14 h-8 rounded-full transition-colors ${isMandatory ? "bg-[var(--color-primary)]" : "bg-gray-300"
                }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${isMandatory ? "translate-x-6" : "translate-x-1"
                  }`}
              />
            </button>
            <label className="text-base font-semibold">Is mandatory</label>
          </div>

          <button
            type="button"
            onClick={handleAddSkill}
            disabled={!skillName.trim() || !years}
            className="h-14 rounded text-white font-semibold text-lg mt-2 transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            Add Skill
          </button>


          <ProjectSkillsTable skills={skills} />
        </div>

        <div className="h-6" />
      </div>
    </Card>
  );
}