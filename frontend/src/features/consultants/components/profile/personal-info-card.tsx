import { SectionCard } from "../../../../components/shared/section-card";
import { DetailField } from "../../../../components/shared/detail-field";

interface PersonalInfoCardProps {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
  readonly idNumber?: string;
  nationality?: string;
}

export default function PersonalInfoCard({
  firstName,
  lastName,
  email,
  phone,
 idNumber,
  nationality
}: PersonalInfoCardProps) {
  return (
    <SectionCard title="Personal Information">
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "28px" }}>
        <DetailField label="First Name" value={firstName} variant="compact" />
        <DetailField label="Last Name" value={lastName} variant="compact" />
        <DetailField label="Email Address" value={email} variant="compact" />
        <DetailField label="Phone Number" value={phone} variant="compact" />
        <DetailField label="ID Number" value={idNumber ?? "N/A"} variant="compact" />
        <DetailField label="Nationality" value={nationality ?? "N/A"} variant="compact" />
      </div>
    </SectionCard>
  );
}