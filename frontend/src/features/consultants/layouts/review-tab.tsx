import { useConsultantProfile } from "../pages/consultant-profile.context";
import type { Tab } from "../pages/create-profile-page";
import { Pencil, CheckCircle } from "lucide-react";

interface Props {
  onEdit: (tab: Tab) => void;
  onSave: () => void;
  isSaving: boolean;
}

function formatDate(iso: string) {
  if (!iso) return "Present";
  return new Date(iso).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}

function SectionHeader({ title, tab, onEdit }: { title: string; tab: Tab; onEdit: (tab: Tab) => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold" style={{ color: "var(--color-primary)" }}>{title}</h2>
      <button
        onClick={() => onEdit(tab)}
        className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition hover:bg-gray-100"
        style={{ color: "var(--color-primary)" }}
      >
        <Pencil size={14} />
        Edit
      </button>
    </div>
  );
}

export default function ReviewTab({ onEdit, onSave, isSaving }: Props) {
  const { profileData } = useConsultantProfile();
  const location = sessionStorage.getItem("location_addressLine1")
    ? [
        sessionStorage.getItem("location_addressLine1"),
        sessionStorage.getItem("location_suburb"),
        sessionStorage.getItem("location_city"),
        sessionStorage.getItem("location_province"),
        sessionStorage.getItem("location_postalCode"),
      ].filter(Boolean).join(", ")
    : profileData.location;

  const jobTypeLabel: Record<string, string> = {
    FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract",
    INTERNSHIP: "Internship", FREELANCE: "Freelance",
  };

  const workModelLabel: Record<string, string> = {
    ONSITE: "On-site", REMOTE: "Remote", HYBRID: "Hybrid",
  };

  return (
    <div className="flex flex-col gap-8 pb-16">
      <div className="bg-white rounded-2xl border" style={{ borderColor: "var(--color-border)", padding: "40px" }}>
        <SectionHeader title="Personal Information" tab="personal" onEdit={onEdit} />
        <div className="grid grid-cols-2 text-sm" style={{ rowGap: "24px", columnGap: "32px" }}>
          <div>
            <p className="font-medium text-slate-500">Phone</p>
            <p className="font-semibold mt-1" style={{ color: "var(--color-primary)" }}>{profileData.phone || "—"}</p>
          </div>
          <div>
            <p className="font-medium text-slate-500">SA ID Number</p>
            <p className="font-semibold mt-1" style={{ color: "var(--color-primary)" }}>{profileData.idNumber || "—"}</p>
          </div>
          <div>
            <p className="font-medium text-slate-500">Nationality</p>
            <p className="font-semibold mt-1" style={{ color: "var(--color-primary)" }}>{profileData.nationality || "—"}</p>
          </div>
          <div>
            <p className="font-medium text-slate-500">Availability</p>
            <p className="font-semibold mt-1" style={{ color: "var(--color-primary)" }}>
              {profileData.availability === "AVAILABLE" ? "Available" : profileData.availability === "UNAVAILABLE" ? "Unavailable" : "On Leave"}
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-500">Cost to Company</p>
            <p className="font-semibold mt-1" style={{ color: "var(--color-primary)" }}>
              {profileData.costToCompany > 0 ? `R ${profileData.costToCompany.toLocaleString()}` : "—"}
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-500">Location</p>
            <p className="font-semibold mt-1" style={{ color: "var(--color-primary)" }}>{location || "—"}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border" style={{ borderColor: "var(--color-border)", padding: "40px" }}>
        <SectionHeader title={`Experience (${profileData.experiences.length})`} tab="experience" onEdit={onEdit} />
        {profileData.experiences.length === 0 ? (
          <p className="text-slate-400 text-sm">No experience added.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {profileData.experiences.map((exp, i) => (
              <div key={exp.id ?? i} className="border rounded-xl" style={{ borderColor: "var(--color-border)", padding: "28px" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-base" style={{ color: "var(--color-primary)" }}>{exp.companyName}</p>
                    <p className="font-medium text-slate-600" style={{ marginTop: "4px" }}>{exp.jobTitle}</p>
                  </div>
                  <div className="flex items-center" style={{ gap: "20px" }}>
                    <span className="inline-flex items-center justify-center text-xs h-6 w-20 rounded-full font-medium text-white" style={{ backgroundColor: "var(--color-primary)" }}>
                      {jobTypeLabel[exp.jobType] ?? exp.jobType}
                    </span>
                    <span className="inline-flex items-center justify-center text-xs h-6 w-20 rounded-full font-medium border" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                      {workModelLabel[exp.workModel] ?? exp.workModel}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  {formatDate(exp.startDate)} — {exp.endDate ? formatDate(exp.endDate) : "Present"}
                </p>
                {exp.description && (
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border" style={{ borderColor: "var(--color-border)", padding: "40px" }}>
        <SectionHeader title={`Skills (${profileData.skills.length})`} tab="skills" onEdit={onEdit} />
        {profileData.skills.length === 0 ? (
          <p className="text-slate-400 text-sm">No skills added.</p>
        ) : (
          <div className="flex flex-wrap" style={{ gap: "20px" }}>
            {profileData.skills.map((skill, i) => (
              <div
                key={i}
                className="flex flex-col items-start border rounded-xl"
                style={{
                  borderColor: "var(--color-border)",
                  padding: "16px 24px",
                  minWidth: "180px",
                }}
              >
                <p className="font-semibold text-base" style={{ color: "var(--color-primary)" }}>{skill.skillName}</p>
                <p className="text-sm text-slate-500" style={{ marginTop: "8px" }}>{skill.competencyLevel} · {skill.yearsExperience} yrs · {skill.confidenceLevel}/4 confidence</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl border" style={{ borderColor: "var(--color-border)", padding: "40px" }}>
        <div className="flex items-center gap-3">
          <CheckCircle size={22} className="text-green-500" />
          <p className="font-semibold font-medium text-base" style={{ color: "var(--color-primary)" }}>
            Ready to create this consultant profile?
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="h-12 w-30 px-10 rounded-xl text-white font-bold text-base transition hover:brightness-110 disabled:opacity-60"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          {isSaving ? "Creating Profile..." : "Create Profile"}
        </button>
      </div>
    </div>
  );
}