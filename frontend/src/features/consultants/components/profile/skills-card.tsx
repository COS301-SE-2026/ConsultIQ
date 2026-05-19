
export type CompetencyLevel = "BEGINNER" | "INTERMEDIATE" | "EXPERT";

export interface Skill {
  name: string;
  competencyLevel: CompetencyLevel;
  yearsOfExperience: number;
}


interface SkillsCardProps {
  skills: Skill[];
}

function SkillsCard({ skills }: SkillsCardProps) {
  return (
    <div
      className="bg-white rounded-2xl px-10 py-8"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h2
        className="font-bold text-xl mb-8"
        style={{ color: "var(--color-primary)" }}
      >
        Skills
      </h2>

      {/* Table header */}
      <div
        className="grid grid-cols-3 pb-3 mb-1 text-sm font-medium"
        style={{
          borderBottom: "1px solid var(--color-border)",
          color: "var(--color-text-secondary)",
        }}
      >
        <span>Skill</span>
        <span>Competency level</span>
        <span>Years of experience</span>
      </div>

      {/* Rows */}
      {skills.map((skill, index) => (
        <div
          key={skill.name}
          className="grid grid-cols-3 py-5 text-base"
          style={{
            borderBottom: index < skills.length - 1 ? "1px solid var(--color-border)" : "none",
            color: "var(--color-text-primary)",
          }}
        >
          <span>{skill.name}</span>
          <span>{skill.competencyLevel}</span>
          <span>{skill.yearsOfExperience}</span>
        </div>
      ))}
    </div>
  );
}

export default SkillsCard;