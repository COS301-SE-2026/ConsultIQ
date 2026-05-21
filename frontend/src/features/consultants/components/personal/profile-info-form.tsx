import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { useConsultantProfile } from "../../pages/consultant-profile.context";

export default function ProfileInfoForm() {
  const { updateProfileData } = useConsultantProfile();

  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [nationality, setNationality] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [costToCompany, setCostToCompany] = useState("");

  const [phoneError, setPhoneError] = useState("");
  const [idError, setIdError] = useState("");
  const [nationalityError, setNationalityError] = useState("");
  const [costError, setCostError] = useState("");

  function validateSAID(id: string): boolean {
    if (!/^\d{13}$/.test(id)) return false;
    const month = parseInt(id.substring(2, 4));
    const day = parseInt(id.substring(4, 6));
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    let sum = 0;
    let isEven = false;
    for (let i = id.length - 1; i >= 0; i--) {
      let digit = parseInt(id[i]);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  }

  const handleDone = () => {
    let isValid = true;

    if (!/^\d{10}$/.test(phone)) {
      setPhoneError("Phone number must be exactly 10 digits.");
      isValid = false;
    } else {
      setPhoneError("");
    }

    if (!validateSAID(idNumber)) {
      setIdError("Please enter a valid South African ID number.");
      isValid = false;
    } else {
      setIdError("");
    }

    if (!nationality.trim()) {
      setNationalityError("Nationality is required.");
      isValid = false;
    } else if (!/^[a-zA-Z\s'-]+$/.test(nationality.trim())) {
      setNationalityError("Nationality must contain letters only.");
      isValid = false;
    } else {
      setNationalityError("");
    }

    if (costToCompany !== "" && Number(costToCompany) < 0) {
      setCostError("Cost to company cannot be negative.");
      isValid = false;
    } else {
      setCostError("");
    }

    if (!isValid) return;

    updateProfileData({
      phone: phone.replace(/\D/g, ""),
      idNumber,
      nationality: nationality.trim(),
      costToCompany: costToCompany ? parseFloat(costToCompany) : 0,
      availability: isAvailable ? "AVAILABLE" : "UNAVAILABLE",
    });

    toast.success("Personal information saved!");
  };

  return (
    <Card className="p-12 h-full w-full flex items-start justify-center">
      <div className="w-full max-w-[800px] flex flex-col h-full">
        <div className="h-6" />
        <h2 className="text-3xl font-bold mb-8" style={{ color: "var(--color-primary)" }}>
          Personal Information
        </h2>
        <div className="h-6" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
          <div className="flex flex-col gap-3">
            <label htmlFor="phone" className="text-base font-semibold">Phone Number</label>
            <Input
              id="phone"
              type="tel"
              maxLength={10}
              value={phone}
              onChange={(e) => { setPhone(e.target.value); if (phoneError) setPhoneError(""); }}
              placeholder="0123456789"
              className={phoneError ? "border-red-500" : ""}
            />
            {phoneError && <span className="text-red-500 text-sm">{phoneError}</span>}
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="id-number" className="text-base font-semibold">SA ID Number</label>
            <Input
              id="id-number"
              maxLength={13}
              value={idNumber}
              onChange={(e) => { setIdNumber(e.target.value); if (idError) setIdError(""); }}
              placeholder="1234567890123"
              className={idError ? "border-red-500" : ""}
            />
            {idError && <span className="text-red-500 text-sm">{idError}</span>}
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="nationality" className="text-base font-semibold">Nationality</label>
            <Input
              id="nationality"
              placeholder="South African"
              value={nationality}
              onChange={(e) => { setNationality(e.target.value); if (nationalityError) setNationalityError(""); }}
              className={nationalityError ? "border-red-500" : ""}
            />
            {nationalityError && <span className="text-red-500 text-sm">{nationalityError}</span>}
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="cost-to-company" className="text-base font-semibold">Cost to Company (R)</label>
            <div className="relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-semibold select-none z-10"
                style={{ color: "var(--color-primary)" }}
              >
                R
              </span>
              <Input
                id="cost-to-company"
                type="number"
                min="0"
                step="100"
                placeholder="0.00"
                value={costToCompany}
                onChange={(e) => { setCostToCompany(e.target.value); if (costError) setCostError(""); }}
                onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }}
                className={costError ? "border-red-500" : ""}
                style={{ paddingLeft: "2.5rem" }}
              />
            </div>
            {costError && <span className="text-red-500 text-sm">{costError}</span>}
          </div>
        </div>

        <div className="h-6" />

        {/* Availability Toggle */}
        <div className="flex flex-col gap-3">
          <label className="text-base font-semibold">Availability</label>
          <div className="flex items-center gap-4 h-10">
            <button
              type="button"
              role="switch"
              aria-checked={isAvailable}
              onClick={() => setIsAvailable((prev) => !prev)}
              className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
              style={{ backgroundColor: isAvailable ? "var(--color-accent)" : "#d1d5db" }}
            >
              <span
                className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200"
                style={{ transform: isAvailable ? "translateX(20px)" : "translateX(0px)" }}
              />
            </button>
            <span
              className="text-base font-medium"
              style={{ color: isAvailable ? "var(--color-accent)" : "#6b7280" }}
            >
              {isAvailable ? "Available" : "Unavailable"}
            </span>
          </div>
        </div>

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