interface LocationCardProps {
  address1: string;
  address2: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </p>
      <p className="font-semibold text-base" style={{ color: "var(--color-text-primary)" }}>
        {value}
      </p>
    </div>
  );
}

function LocationCard({ address1, address2, suburb, city, province, postalCode }: LocationCardProps) {
  return (
    <div
      className="bg-white rounded-2xl px-10 py-8"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h2
        className="font-bold text-xl mb-8"
        style={{ color: "var(--color-primary)" }}
      >
        Location
      </h2>

      <div className="grid grid-cols-2 gap-x-20 gap-y-8">
        <ProfileField label="Address line 1" value={address1} />
        <ProfileField label="City"           value={city} />
        <ProfileField label="Address line 2" value={address2} />
        <ProfileField label="Postal code"    value={postalCode} />
        <ProfileField label="Suburb"         value={suburb} />
        <div />
        <ProfileField label="Province"       value={province} />
      </div>
    </div>
  );
}

export default LocationCard;