interface LocationCardProps {
  readonly address1: string;
  readonly address2: string;
  readonly suburb: string;
  readonly city: string;
  readonly province: string;
  readonly postalCode: string;
}

function ProfileField({ label, value }: { label: string; value: string }) {
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

function LocationCard({
  address1,
  address2,
  suburb,
  city,
  province,
  postalCode,
}: LocationCardProps) {
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
        Location
      </h2>

      <hr style={{ borderColor: "var(--color-border)" }} />

      <div className="flex flex-col" style={{ gap: "28px" }}>
        <ProfileField label="Address Line 1" value={address1} />
        <ProfileField label="Address Line 2" value={address2} />
      </div>

      <hr style={{ borderColor: "var(--color-border)" }} />

      <div
        className="grid grid-cols-1 md:grid-cols-2"
        style={{ gap: "28px" }}
      >
        <ProfileField label="Suburb"      value={suburb} />
        <ProfileField label="City"        value={city} />
        <ProfileField label="Province"    value={province} />
        <ProfileField label="Postal Code" value={postalCode} />
      </div>
    </div>
  );
}

export default LocationCard;