import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { useConsultantProfile } from "../../pages/consultant-profile.context";

interface Props {
  onComplete?: () => void;
}

export default function LocationForm({ onComplete }: Props) {  const { updateProfileData } = useConsultantProfile();

  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [suburb, setSuburb] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [error, setError] = useState("");

  const handleDone = () => {
    if (!addressLine1.trim() || !city.trim() || !province.trim()) {
      setError("Address line 1, city and province are required.");
      return;
    }
    setError("");

    const location = [addressLine1.trim(), suburb.trim(), city.trim(), province.trim(), postalCode.trim()]
      .filter(Boolean)
      .join(", ");

    // Also save to sessionStorage so create-profile-page can read them
    sessionStorage.setItem("location_addressLine1", addressLine1.trim());
    sessionStorage.setItem("location_addressLine2", addressLine2.trim());
    sessionStorage.setItem("location_suburb", suburb.trim());
    sessionStorage.setItem("location_city", city.trim());
    sessionStorage.setItem("location_province", province.trim());
    sessionStorage.setItem("location_postalCode", postalCode.trim());

    updateProfileData({ location });
    toast.success("Location saved!");
    onComplete?.();
  };

  return (
    <Card className="p-12 h-full w-full flex items-start justify-center">
      <div className="w-full max-w-[800px] flex flex-col h-full">
        <div className="h-6" />
        <h2 className="text-3xl font-bold mb-8" style={{ color: "var(--color-primary)" }}>
          Location
        </h2>
        <div className="h-6" />

        <div className="space-y-6 flex-1 gap-6 flex flex-col">
          <div className="flex flex-col gap-3">
            <label htmlFor="address-line-1" className="text-base font-semibold">
              Address Line 1 <span className="text-red-500">*</span>
            </label>
            <Input
              id="address-line-1"
              placeholder="Address Line 1"
              value={addressLine1}
              onChange={(e) => { setAddressLine1(e.target.value); if (error) setError(""); }}
            />
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="address-line-2" className="text-base font-semibold">Address Line 2</label>
            <Input
              id="address-line-2"
              placeholder="Address Line 2"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <label htmlFor="suburb" className="text-base font-semibold">Suburb</label>
              <Input id="suburb" placeholder="Suburb" value={suburb} onChange={(e) => setSuburb(e.target.value)} />
            </div>
            <div className="flex flex-col gap-3">
              <label htmlFor="city" className="text-base font-semibold">
                City <span className="text-red-500">*</span>
              </label>
              <Input
                id="city"
                placeholder="City"
                value={city}
                onChange={(e) => { setCity(e.target.value); if (error) setError(""); }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <label htmlFor="province" className="text-base font-semibold">
                Province <span className="text-red-500">*</span>
              </label>
              <select
                id="province"
                className="flex h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-[#002D72]"
                value={province}
                onChange={(e) => { setProvince(e.target.value); if (error) setError(""); }}
              >
                <option value="" disabled>Select Province</option>
                <option value="Eastern Cape">Eastern Cape</option>
                <option value="Free State">Free State</option>
                <option value="Gauteng">Gauteng</option>
                <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                <option value="Limpopo">Limpopo</option>
                <option value="Mpumalanga">Mpumalanga</option>
                <option value="North West">North West</option>
                <option value="Northern Cape">Northern Cape</option>
                <option value="Western Cape">Western Cape</option>
              </select>
            </div>
            <div className="flex flex-col gap-3">
              <label htmlFor="postal-code" className="text-base font-semibold">Postal Code</label>
              <Input
                id="postal-code"
                placeholder="Postal Code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

        <div className="h-6" />
        <div className="mt-8 flex justify-end w-full">
          <Button
            onClick={handleDone}
            className="h-16 w-48 text-lg rounded font-semibold transition bg-gray-50 hover:bg-gray-100"
            style={{ color: "var(--color-primary)" }}
          >
            Done
          </Button>
        </div>
        <div className="h-6" />
      </div>
    </Card>
  );
}