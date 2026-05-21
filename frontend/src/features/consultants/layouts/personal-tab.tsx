import ProfileInfoForm from "../components/personal/profile-info-form";
import LocationForm from "../components/personal/location-form";

interface Props {
  onComplete: () => void;
}

export default function PersonalTab({ onComplete }: Props) {
  return (
    <div className="space-y-8">
      <ProfileInfoForm />
      <div className="h-6" />
      <LocationForm onComplete={onComplete} />
    </div>
  );
}