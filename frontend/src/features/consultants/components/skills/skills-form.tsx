import { useState, useMemo, useEffect } from "react";
import { Card } from "../../../../components/ui/card"
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import ProjectSkillsTable from "../../../projects/components/project-skills-table";
import type { ProjectSkillData as Skill } from "../../../projects/types/project.types";

const sanitizeText = (input: string) => {
    if (!input) return "";
    return input.replace(/[^a-zA-Z0-9\s.,&'\-@_+/#()!]/g, "");
};

export default function SkillsForm() {
    const [skills, setSkills] = useState<Skill[]>(() => {
        const saved = sessionStorage.getItem("skills_list");
        if (saved) {
            return JSON.parse(saved);
        }
        return [];
    });
    const [skillName, setSkillName] = useState("");
    const [confidence, setConfidence] = useState("");
    const [years, setYears] = useState("");

    const competencyLevel = useMemo(() => {
        if (!confidence || !years) return "";
        const c = Number.parseInt(confidence, 10);
        const y = Number.parseInt(years, 10);

        if (c >= 4 && y >= 5) return "Expert";
        if (c >= 3 && y >= 3) return "Advanced";
        if (c >= 2 && y >= 1) return "Intermediate";
        return "Beginner";
    }, [confidence, years]);

    const handleAddSkill = () => {
        if (!skillName.trim() || !years || !confidence) return;

        // Look for where you are updating the skill array state:
        setSkills((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                name: skillName.trim(),
                competency: competencyLevel,
                years: Number.parseInt(years, 10) || 0,
                mandatory: false, // Fully satisfies the ProjectSkillData type mapping
            }
        ]);

        setSkillName("");
        setConfidence("");
        setYears("");
    };

    useEffect(() => {
        const sanitizedList = skills.map((skill) => ({
            ...skill,
            name: sanitizeText(skill.name),
            competency: sanitizeText(skill.competency),
        }));
        sessionStorage.setItem("skills_list", JSON.stringify(sanitizedList));
    }, [skills]);

    return (
        <Card className="p-12 h-full w-full flex items-start justify-center">
            <div className="w-full max-w-[800px] flex flex-col h-full">
                <div className="h-6" />
                <h2
                    className="text-3xl font-bold mb-8"
                    style={{ color: "var(--color-primary)" }}
                >
                    Skills
                </h2>
                <div className="h-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-3">
                        <label htmlFor="skill-name" className="text-sm font-medium">
                            Skill Name
                        </label>

                        <Input
                            id="skill-name"
                            placeholder="React"
                            value={skillName}
                            onChange={(e) => setSkillName(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <label htmlFor="confidence" className="text-sm font-medium">
                            Confidence
                        </label>

                        <select
                            id="confidence"
                            value={confidence}
                            onChange={(e) => setConfidence(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                        >
                            <option value="" disabled>Select confidence (1-4)</option>
                            <option value="1">1 - Low</option>
                            <option value="2">2 - Moderate</option>
                            <option value="3">3 - High</option>
                            <option value="4">4 - Expert</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-3">
                        <label htmlFor="years-of-experience" className="text-sm font-medium">
                            Years of Experience
                        </label>

                        <Input
                            id="years-of-experience"
                            type="number"
                            placeholder="5"
                            min="0"
                            value={years}
                            onChange={(e) => setYears(e.target.value)}
                        />

                    </div>
                    <div className="flex flex-col gap-3">
                        <label htmlFor="competency-level" className="text-sm font-medium">
                            Competency Level
                        </label>
                        <Input
                            id="competency-level"
                            type="text"
                            placeholder="Auto-calculated"
                            value={competencyLevel}
                            readOnly
                            className="bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                    </div>
                </div>
                <div className="h-6" />

                <Button
                    onClick={handleAddSkill}
                    disabled={!skillName.trim() || !years || !confidence}
                    className="self-end h-8 w-20 px-6 text-sm font-medium rounded transition disabled:opacity-50"
                    style={{
                        backgroundColor:
                            "var(--color-primary)",
                    }}
                >
                    Add Skill
                </Button>
                <div className="h-6" />
                <div className="mt-8 w-full">
                    <ProjectSkillsTable skills={skills} />
                </div>
                <div className="h-6" />
            </div>
        </Card>
    );
}