import ProfileInfoForm from "../components/personal/profile-info-form";
import LocationForm from "../components/personal/location-form";

export default function PersonalTab() {
    return (
        <div className="space-y-8">
            <ProfileInfoForm />
            <div className="h-6" />
            <LocationForm />
        </div>
    );
}