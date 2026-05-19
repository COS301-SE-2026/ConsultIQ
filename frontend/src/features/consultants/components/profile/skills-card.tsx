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
      className="bg-white rounded-2xl w-full flex flex-col"
      style={{
        padding: "28px 28px 28px 28px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        gap: "28px",
      }}
    >
      
      <h2
        className="font-bold"
        style={{ color: "var(--color-primary)", fontSize: "22px" }}
      >
        Skills
      </h2>
 
      <hr style={{ borderColor: "var(--color-border)" }} />
 
      {/* Table header */}
      <div
        className="grid grid-cols-3 font-semibold"
        style={{
          fontSize: "var(--text-h4)",
          color: "var(--color-text-secondary)",
          paddingBottom: "12px",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span>Skill Name</span>
        <span>Competency Level</span>
        <span>Years of Experience</span>
      </div>
 
      {/* Rows */}
      <div className="flex flex-col">
        {skills.map((skill, index) => (
          <div
            key={skill.name}
            className="grid grid-cols-3 font-medium"
            style={{
              fontSize: "var(--text-h3)",
              color: "var(--color-text-primary)",
              padding: "18px 0",
              borderBottom:
                index < skills.length - 1
                  ? "1px solid var(--color-border)"
                  : "none",
            }}
          >
            <span>{skill.name}</span>
            <span className="capitalize">{skill.competencyLevel.toLowerCase()}</span>
            <span>{skill.yearsOfExperience}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
 
export default SkillsCard;