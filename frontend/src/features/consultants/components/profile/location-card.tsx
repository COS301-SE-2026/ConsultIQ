import { SectionCard } from "../../../../components/shared/section-card";
import { DetailField } from "../../../../components/shared/detail-field";

interface LocationCardProps {
  readonly address1: string;
  readonly address2: string;
  readonly suburb: string;
  readonly city: string;
  readonly province: string;
  readonly postalCode: string;
}

export default function LocationCard({
  address1,
  address2,
  suburb,
  city,
  province,
  postalCode,
}: LocationCardProps) {
  return (
    <SectionCard title="Location">
      <div className="flex flex-col" style={{ gap: "28px" }}>
        <DetailField label="Address Line 1" value={address1} variant="compact" />
        <DetailField label="Address Line 2" value={address2} variant="compact" />
      </div>

      <hr style={{ borderColor: "var(--color-border)" }} />

      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "28px" }}>
        <DetailField label="Suburb" value={suburb} variant="compact" />
        <DetailField label="City" value={city} variant="compact" />
        <DetailField label="Province" value={province} variant="compact" />
        <DetailField label="Postal Code" value={postalCode} variant="compact" />
      </div>
    </SectionCard>
  );
}