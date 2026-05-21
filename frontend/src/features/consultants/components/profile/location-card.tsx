import { SectionCard } from "../../../../components/shared/section-card";
import { DetailField } from "../../../../components/shared/detail-field";

interface LocationCardProps {
  readonly address1?: string;
}

export default function LocationCard({
  address1,
 
}: LocationCardProps) {
  

  return (
    <SectionCard title="Location">
      <DetailField 
        label="Address" 
        value={address1 || "No location provided"} 
        variant="compact" 
      />
    </SectionCard>
  );
}