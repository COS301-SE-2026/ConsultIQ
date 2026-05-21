import { useState, useMemo } from "react";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { toast } from "sonner";

interface LocationFormProps {
    onNext?: () => void;
}

export default function LocationForm({ onNext }: LocationFormProps = {}) {
    const [addressLine1, setAddressLine1] = useState(() => sessionStorage.getItem("location_addressLine1") || "");
    const [addressLine2, setAddressLine2] = useState(() => sessionStorage.getItem("location_addressLine2") || "");
    const [suburb, setSuburb] = useState(() => sessionStorage.getItem("location_suburb") || "");
    const [city, setCity] = useState(() => sessionStorage.getItem("location_city") || "");
    const [province, setProvince] = useState(() => sessionStorage.getItem("location_province") || "");
    const [postalCode, setPostalCode] = useState(() => sessionStorage.getItem("location_postalCode") || "");
    const [cityError, setCityError] = useState("");

    const isFormValid = useMemo(() => {
        if (!addressLine1.trim() || !suburb.trim() || !city.trim() || !province.trim() || !postalCode.trim()) return false;
        if (/\d/.test(city)) return false;
        return true;
    }, [addressLine1, suburb, city, province, postalCode]);

    const handleDone = () => {
        let isValid = true;
        if (/\d/.test(city)) {
            setCityError("City cannot contain numbers");
            isValid = false;
        }
        if (!isValid) return;

        // Strict allowlist sanitization for plain text fields
        const sanitizeAddress = (text: string) => text.replace(/[^a-zA-Z0-9\s.,#'-]/g, "");
        const sanitizeText = (text: string) => text.replace(/[^a-zA-Z\s.,'-]/g, "");
        const sanitizeAlphanumeric = (text: string) => text.replace(/[^a-zA-Z0-9\s-]/g, "");

        const sanitizedAddressLine1 = sanitizeAddress(addressLine1);
        sessionStorage.setItem("location_addressLine1", sanitizedAddressLine1); //NOSONAR

        const sanitizedAddressLine2 = sanitizeAddress(addressLine2);
        sessionStorage.setItem("location_addressLine2", sanitizedAddressLine2); //NOSONAR

        const sanitizedSuburb = sanitizeText(suburb);
        sessionStorage.setItem("location_suburb", sanitizedSuburb); //NOSONAR

        const sanitizedCity = sanitizeText(city);
        sessionStorage.setItem("location_city", sanitizedCity); //NOSONAR

        const sanitizedProvince = sanitizeText(province);
        sessionStorage.setItem("location_province", sanitizedProvince); //NOSONAR

        const sanitizedPostalCode = sanitizeAlphanumeric(postalCode);
        sessionStorage.setItem("location_postalCode", sanitizedPostalCode); //NOSONAR

      
        console.log("Location Saved:", { addressLine1, addressLine2, suburb, city, province, postalCode });

        toast.success("Location information saved successfully!");
        if (onNext) onNext();
    };

    return (
        <Card className="p-12 h-full w-full flex items-start justify-center">
            <div className="w-full max-w-[800px] flex flex-col h-full">
                <div className="h-6" />

                <h2 
                    className="text-3xl font-bold mb-8"
                    style={{ color: "var(--color-primary)" }}
                >
                    Location
                </h2>
                <div className="h-6" />

                <div className="space-y-6 flex-1 gap-6 flex flex-col">
                    <div className="flex flex-col gap-3">
                        <label htmlFor="address-line-1" className="text-base font-semibold">Address Line 1</label>
                        <Input id="address-line-1" placeholder="Address Line 1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
                    </div>

                    <div className="flex flex-col gap-3">
                        <label htmlFor="address-line-2" className="text-base font-semibold">Address Line 2</label>
                        <Input id="address-line-2" placeholder="Address Line 2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-3">
                            <label htmlFor="suburb" className="text-base font-semibold">Suburb</label>
                            <Input id="suburb" placeholder="Suburb" value={suburb} onChange={(e) => setSuburb(e.target.value)} />
                        </div>

                        <div className="flex flex-col gap-3">
                            <label htmlFor="city" className="text-base font-semibold">City</label>
                            <Input 
                                id="city" 
                                placeholder="City" 
                                value={city} 
                                onChange={(e) => {
                                    setCity(e.target.value);
                                    if (cityError) setCityError("");
                                }} 
                                className={cityError ? "border-red-500 focus-visible:ring-red-500" : ""}
                            />
                            {cityError && <span className="text-red-500 text-sm mt-1">{cityError}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-3">
                            <label htmlFor="province" className="text-base font-semibold">Province</label>
                            <select
                                id="province"
                                className="flex h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-[#002D72] focus:ring-2 focus:ring-[#002D72]/20"
                                value={province}
                                onChange={(e) => setProvince(e.target.value)}
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
                            <Input id="postal-code" placeholder="Postal Code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                        </div>
                    </div>
                </div>
                <div className="h-6" />
                <div className="mt-8 flex justify-end w-full">
                    <Button onClick={handleDone} className={`h-16 w-48 text-lg rounded font-semibold transition ${isFormValid ? "hover:brightness-110" : "bg-gray-50 hover:bg-gray-100"}`}
                        style={{
                            backgroundColor: isFormValid ? "var(--color-accent)" : undefined,
                            color: isFormValid ? "white" : "var(--color-primary)",
                        }}
                    >
                        Done
                    </Button>
                </div>

                <div className="h-6" />
            </div>
        </Card>
    );
}