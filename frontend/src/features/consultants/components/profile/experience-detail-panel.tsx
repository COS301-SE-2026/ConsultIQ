import { DetailPanel } from "../../../../components/shared/detail-panel";
import { DetailField } from "../../../../components/shared/detail-field";

export interface Experience {
  id: string;
  company: string;
  jobTitle: string;
  location: string;
  jobType: string;
  startDate: string;
  endDate: string;
  duration: string;
  roleDescription: string;
}

interface ExperienceDetailPanelProps {
  readonly experience: Experience;
  readonly onClose: () => void;
}

export default function ExperienceDetailPanel({ experience, onClose }: ExperienceDetailPanelProps) {
  return (
    <DetailPanel title="Experience" onClose={onClose}>
      <DetailField label="Job title" value={experience.jobTitle} />
      <DetailField label="Company/organisation" value={experience.company} />
      <DetailField label="Location" value={experience.location} />
      <DetailField label="Job type" value={experience.jobType} />
      <DetailField
        label="Start and end date"
        value={`${experience.startDate}, ${experience.endDate}`}
      />
      <DetailField label="Role description" value={experience.roleDescription} />
    </DetailPanel>
  );
}