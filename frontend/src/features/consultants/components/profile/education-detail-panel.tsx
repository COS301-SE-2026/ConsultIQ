import { DetailPanel } from "../../../../components/shared/detail-panel";
import { DetailField } from "../../../../components/shared/detail-field";
import { AttachmentDisplay } from "../../../../components/shared/attachment-display";

export interface Education {
  id: string;
  institution: string;
  qualification: string;
  startDate: string;
  endDate: string;
  attachmentName?: string;
}

interface EducationDetailPanelProps {
  readonly education: Education;
  readonly onClose: () => void;
}

export default function EducationDetailPanel({ education, onClose }: EducationDetailPanelProps) {
  return (
    <DetailPanel title="Education" onClose={onClose}>
      <DetailField label="Institution name" value={education.institution} />
      <DetailField label="Qualification" value={education.qualification} />
      <DetailField
        label="Start and end date"
        value={`${education.startDate}, ${education.endDate}`}
      />
      {education.attachmentName && <AttachmentDisplay attachmentName={education.attachmentName} />}
    </DetailPanel>
  );
}