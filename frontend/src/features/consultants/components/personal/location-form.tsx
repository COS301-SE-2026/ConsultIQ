import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { useConsultantProfile } from "../../pages/consultant-profile.context";
import SearchBar from "../../../../components/shared/search-bar";

interface Props {
  onComplete?: () => void;
}

export default function LocationForm({ onComplete }: Props) {
  const { updateProfileData } = useConsultantProfile();

  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [suburb, setSuburb] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [error, setError] = useState("");
  const [addressSearch, setAddressSearch] = useState("");

  const handleDone = () => {
    if (!addressLine1.trim() || !city.trim() || !province.trim() || !postalCode.trim()) {
      setError("Address line 1, city, province and postal code are required.");
      return;
    }
    setError("");

    // Also save to sessionStorage so create-profile-page can read them
    sessionStorage.setItem("location_addressLine1", addressLine1.trim());
    sessionStorage.setItem("location_addressLine2", addressLine2.trim());
    sessionStorage.setItem("location_suburb", suburb.trim());
    sessionStorage.setItem("location_city", city.trim());
    sessionStorage.setItem("location_province", province.trim());
    sessionStorage.setItem("location_postalCode", postalCode.trim());

    updateProfileData({
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || null,
      suburb: suburb.trim() || null,
      city: city.trim(),
      province: province.trim(),
      postalCode: postalCode.trim(),

    });
    toast.success("Location saved!");
    onComplete?.();
  };

    const handleSearchAddress = (query: string) => {
        setAddressSearch(query);

    };

  return (
    <Card className="p-6 h-full w-full flex rounded-2xl items-center justify-center">
      <div className="w-full max-w-[800px] flex flex-col h-full mt-6">

        <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--color-primary)" }}>
          Location
        </h2>
        <SearchBar
          value={addressSearch}
          onChange={handleSearchAddress}
          placeholder="Search for an address..."
        />

        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex flex-col gap-3 mt-4">
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


        <div className="mt-6 mb-6 flex justify-end w-full">
          <Button
            variant="default"
            onClick={handleDone}
            className="flex items-center justify-center  rounded-xl font-semibold "
          >
            Done
          </Button>
        </div>
      </div>
    </Card>
  );
}