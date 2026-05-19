interface PersonalInfoCardProps {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
}

function ProfileField({ label, value }: { 
  readonly label: string; 
  readonly value: string }) {
  return (
    <div className="flex flex-col" style={{ gap: "10px", minWidth: 0 }}>
      <p
        className="font-semibold"
        style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-h4)" }}
      >
        {label}
      </p>
      <p
        className="font-semibold break-words"
        style={{ color: "var(--color-text-primary)", fontSize: "var(--text-h3)" }}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function PersonalInfoCard({
  firstName,
  lastName,
  email,
  phone,
}: PersonalInfoCardProps) {
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
        Personal Information
      </h2>

      <hr style={{ borderColor: "var(--color-border)" }} />

      {/* Grid Content Layout */}
      <div
        className="grid grid-cols-1 md:grid-cols-2"
        style={{ gap: "28px" }}
      >
        <ProfileField label="First Name"      value={firstName} />
        <ProfileField label="Last Name"       value={lastName} />
        <ProfileField label="Email Address"   value={email} />
        <ProfileField label="Phone Number"    value={phone} />
      
      </div>
    </div>
  );
}

export default PersonalInfoCard;