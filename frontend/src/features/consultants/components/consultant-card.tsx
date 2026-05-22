import { Mail, Phone, Banknote, ArrowRight } from "lucide-react";

export type ConsultantStatus = "Available" | "Unavailable";

export interface Consultant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  experienceYears: number;
  ratePerHour: number;
  skills: string[];
  status: ConsultantStatus;
}

interface ConsultantCardProps {
  consultant: Consultant;
  onViewDetails?: (id: string) => void;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

function ConsultantCard({ consultant, onViewDetails }: ConsultantCardProps) {
  const {
    id,
    firstName,
    lastName,
    email,
    phone,
    // experienceYears,
    ratePerHour,
    skills,
    status,
  } = consultant;

  const isAvailable = status === "Available";

  return (
    <div
      className="bg-white rounded-2xl flex flex-col shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-shadow duration-200"
      style={{ padding: "28px 28px 24px 28px" }}
    >
      
      <div className="flex items-start gap-5" style={{ marginBottom: "28px" }}>
      
        <div
          className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
          style={{
            width: "76px",
            height: "76px",
            backgroundColor: "var(--color-primary)",
            fontSize: "24px",
          }}
        >
          {getInitials(firstName, lastName)}
        </div>

       
        <div className="flex-1 min-w-0 pt-1">
          <h3
            className="font-bold"
            style={{ color: "var(--color-primary)", fontSize: "22px", lineHeight: "1.25" }}
          >
            {firstName}
            <br />
            {lastName}
          </h3>
          <span
            className="inline-block px-4 rounded-md font-medium"
            style={{
              marginTop: "10px",
              padding: "4px 16px",
            backgroundColor: isAvailable ? "#DCFCE7" : "#F3F4F6",
            color: isAvailable ? "#166534" : "var(--color-text-secondary)",
              fontSize: "var(--text-h4)",
            }}
          >
            {status}
          </span>
        </div>

      
        <span
          className="shrink-0 pt-1"
          style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-h4)" }}
        >
          #{id.slice(0, 8)}
        </span>
      </div>

   
      <hr style={{ borderColor: "var(--color-border)", marginBottom: "24px" }} />

      {/*Contact info */}
      <div className="flex flex-col" style={{ gap: "18px", marginBottom: "24px" }}>
        <div
          className="flex items-center gap-3"
          style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-h4)" }}
        >
          <Mail size={17} className="shrink-0" />
          <span className="truncate">{email}</span>
        </div>
        <div
          className="flex items-center gap-3"
          style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-h4)" }}
        >
          <Phone size={17} className="shrink-0" />
          <span>{phone}</span>
        </div>
      </div>

   
      <hr style={{ borderColor: "var(--color-border)", marginBottom: "24px" }} />

      {/* Experience and Rate */}
      <div className="flex items-center" style={{ gap: "32px", marginBottom: "24px" }}>
        {/* <div
          className="flex items-center gap-2"
          style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-h4)" }}
        >
          <Briefcase size={17} className="shrink-0" />
          <span>{experienceYears} {experienceYears === 1 ? "Year" : "Years"} Experience</span>
        </div> */}
        <div
          className="flex items-center gap-2"
          style={{ color: "var(--color-accent)", fontSize: "var(--text-h4)" }}
        >
          <Banknote size={24} className="shrink-0" />
          <span className="font-semibold">R {ratePerHour} </span>
        </div>
      </div>

      
      <hr style={{ borderColor: "var(--color-border)", marginBottom: "20px" }} />

      {/*Skills*/}
      <div className="flex flex-wrap gap-2" style={{ marginBottom: "28px" }}>
        {skills.map((skill) => (
          <span
            key={skill}
            className="rounded-md border"
            style={{
              padding: "5px 14px",
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
              fontSize: "var(--text-h4)",
            }}
          >
            {skill}
          </span>
        ))}
      </div>

     
      <div className="flex justify-center" style={{ paddingTop: "4px" }}>
        <button
          onClick={() => onViewDetails?.(id)}
          className="flex items-center gap-2 font-bold transition-all duration-150 hover:gap-3"
          style={{ color: "var(--color-secondary)", fontSize: "var(--text-h4)" }}
        >
          View Details <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default ConsultantCard;