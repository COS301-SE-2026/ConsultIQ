import ProfileInfoForm from "../components/personal/profile-info-form";
import LocationForm from "../components/personal/location-form";

interface PersonalTabProps {
    onNext?: () => void;
}

export default function PersonalTab({ onNext }: PersonalTabProps) {
    return (
        <div className="space-y-8">
            <ProfileInfoForm />
            <div className="h-6" />
            <LocationForm onNext={onNext} />
        </div>
    );
}