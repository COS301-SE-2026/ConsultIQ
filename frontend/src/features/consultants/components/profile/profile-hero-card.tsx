interface ProfileHeroCardProps {
  firstName: string;
  lastName: string;
  status: "Available" | "Unavailable";
}

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase();
}

function ProfileHeroCard({ firstName, lastName, status }: ProfileHeroCardProps) {
  const isAvailable = status === "Available";

  return (
    <div
      className="bg-white rounded-2xl w-full flex items-center"
      style={{
        padding: "28px 28px 28px 28px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Avatar */}
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

      {/* Name + badge */}
      <div className="flex flex-col" style={{ marginLeft: "20px", gap: "8px" }}>
        <p
          className="font-bold"
          style={{ color: "var(--color-primary)", fontSize: "22px", lineHeight: "1.25" }}
        >
          {firstName} {lastName}
        </p>
        <span
          className="inline-block self-start rounded-md font-medium"
          style={{
            padding: "4px 16px",
            fontSize: "var(--text-h4)",
            backgroundColor: isAvailable ? "#FEF3C7" : "#F3F4F6",
            color: isAvailable ? "#92400E" : "var(--color-text-secondary)",
          }}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

export default ProfileHeroCard;