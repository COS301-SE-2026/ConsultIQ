import { useState } from "react";
import { Card } from "../../../components/ui/card";
import ProjectSkillsTable from "./project-skills-table";
import type { Skill } from "./project-skills-table";

export default function SkillsCard() {
 const [isMandatory, setIsMandatory] = useState(false);
 const [skills, setSkills] = useState<Skill[]>([
   { id: "1", name: "Java", competency: "Intermediate", years: 3 }
 ]);
 const [skillName, setSkillName] = useState("");
 const [competency, setCompetency] = useState("Intermediate");
 const [years, setYears] = useState("");

 const handleAddSkill = () => {
   if (!skillName.trim() || !years) return;
   
   setSkills((prev) => [
     ...prev,
     {
       id: Math.random().toString(36).substring(2, 9),
       name: skillName,
       competency,
       years: Number(years),
     },
   ]);

   setSkillName("");
   setCompetency("Intermediate");
   setYears("");
   setIsMandatory(false);
 };

  return (
    <Card className="p-12 h-full w-full flex items-start justify-center">
        
      <div className="w-full max-w-[440px] flex flex-col h-full">
        <div className="h-6" />
      <h2 className="text-3xl font-bold mb-8"
        style={{
          color: "var(--color-primary)",
        }}>
        Add Skills
      </h2>
        <div className="h-6" />
      <div className="flex flex-col gap-6 flex-1">
        {/* Skill Name */}
        <div className="flex flex-col gap-3">
          <label htmlFor="skillName" className="text-base font-semibold">
            Skill Name
          </label>
          <input type="text"
            id="skillName"
            placeholder=""
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            className="h-14 rounded border px-4 outline-none"/>
        </div>

        {/* Competency */}
        <div className="flex flex-col gap-3">
          <label htmlFor="competency" className="text-base font-semibold">
            Competency
          </label>
          <select
            id="competency"
            value={competency}
            onChange={(e) => setCompetency(e.target.value)}
            className=" h-14 rounded border px-4 outline-none ">
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>

        {/* Years */}
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
            className="
              h-14
              rounded
              border
              px-4
              outline-none
            "
          />
        </div>

        {/* Mandatory */}
        <div className="flex items-center gap-4">
        <button type="button"
            onClick={() =>setIsMandatory(!isMandatory)}
            className={`relative w-14 h-8 rounded-full transition-colors
            ${isMandatory? "bg-[var(--color-primary)]" : "bg-gray-300"}`}
        >
            <div
            className={` absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-transform
                ${isMandatory? "translate-x-6" : "translate-x-1"}`}
            />
        </button>

        <label htmlFor="mandatory" className="text-base font-semibold">
            Is mandatory
        </label>
        </div>

        {/* Add Button */}
        <button
          type="button"
          onClick={handleAddSkill}
          disabled={!skillName.trim() || !years}
          className="
            h-14 rounded text-white font-semibold text-lg mt-2 transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor:
              "var(--color-primary)",
          }}
        >
          Add Skill
        </button>

        {/* Skills Table */}
        <ProjectSkillsTable skills={skills} />

        {/* Done Button */}
        <div className="mt-auto flex justify-end">
            <button className=" h-16 w-48 text-lg rounded font-semibold transition bg-gray-50 hover:bg-gray-100"
              style={{
                color:
                  "var(--color-primary)",
              }}
            onClick={() => console.log("Skills saved")}
          >
            Done
          </button>
        </div>
        <div className="h-6" />
      </div>
      </div>
    </Card>
  );
}