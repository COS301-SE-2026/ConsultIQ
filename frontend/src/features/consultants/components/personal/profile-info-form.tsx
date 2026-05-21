import { useState, useMemo } from "react";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { toast } from "sonner";

export default function ProfileInfoForm() {
    const [firstName, setFirstName] = useState(() => sessionStorage.getItem("profile_firstName") || "");
    const [lastName, setLastName] = useState(() => sessionStorage.getItem("profile_lastName") || "");
    const [email, setEmail] = useState(() => sessionStorage.getItem("profile_email") || "");
    const [phone, setPhone] = useState(() => sessionStorage.getItem("profile_phone") || "");
    const [idNumber, setIdNumber] = useState(() => sessionStorage.getItem("profile_idNumber") || "");
    const [nationality, setNationality] = useState(() => sessionStorage.getItem("profile_nationality") || "");
    const [isAvailable, setIsAvailable] = useState(() => sessionStorage.getItem("profile_isAvailable") === "true");
    const [costToCompany, setCostToCompany] = useState(() => sessionStorage.getItem("profile_costToCompany") || "");
    
    const [phoneError, setPhoneError] = useState("");
    const [idError, setIdError] = useState("");
    const [costError, setCostError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [nationalityError, setNationalityError] = useState("");

    const validateSouthAfricanId = (id: string): string => {
        // Must be exactly 13 digits
        if (!/^\d{13}$/.test(id)) {
            return "South African ID number must be exactly 13 digits";
        }

        // Extract date components
        const month = parseInt(id.substring(2, 4), 10);
        const day = parseInt(id.substring(4, 6), 10);

        // Basic date validation
        if (
            month < 1 ||
            month > 12 ||
            day < 1 ||
            day > 31
        ) {
            return "Invalid South African ID number";
        }

        // Luhn algorithm validation
        let sum = 0;

        for (let i = 0; i < 13; i++) {
            let digit = parseInt(id.charAt(i), 10);

            if (i % 2 !== 0) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            sum += digit;
        }

        if (sum % 10 !== 0) {
            return "Invalid South African ID number";
        }

        return "";
    };

    const isFormValid = useMemo(() => {
        if (!firstName.trim() || !lastName.trim() || !nationality.trim() || costToCompany === "") return false;
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
        if (!/^\d{10}$/.test(phone)) return false;
        if (validateSouthAfricanId(idNumber) !== "") return false;
        if (Number(costToCompany) < 0) return false;
        if (/\d/.test(nationality)) return false;
        return true;
    }, [firstName, lastName, email, phone, idNumber, nationality, costToCompany]);

    const handleDone = () => {
        let isValid = true;

        if (!email.trim()) {
            setEmailError("Email address is required");
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError("Please enter a valid email address");
            isValid = false;
        }
        if (!/^\d{10}$/.test(phone)) {
            setPhoneError("Phone number must be exactly 10 digits");
            isValid = false;
        }
        
        const idValidationError = validateSouthAfricanId(idNumber);
        if (idValidationError) {
            setIdError(idValidationError);
            isValid = false;
        }
        if (costToCompany !== "" && Number(costToCompany) < 0) {
            setCostError("Cost to company cannot be negative");
            isValid = false;
        }
        if (/\d/.test(nationality)) {
            setNationalityError("Nationality cannot contain numbers");
            isValid = false;
        }
        if (!isValid) return;

        // Strict allowlist sanitization for plain text fields
        const sanitizeName = (text: string) => text.replace(/[^a-zA-Z\s.,'-]/g, "");
        const sanitizeEmail = (text: string) => text.replace(/[^a-zA-Z0-9._@+-]/g, "");
        const sanitizeNumeric = (text: string) => text.replace(/\D/g, "");

        const sanitizedFirstName = sanitizeName(firstName);
        sessionStorage.setItem("profile_firstName", sanitizedFirstName); //NOSONAR

        const sanitizedLastName = sanitizeName(lastName);
        sessionStorage.setItem("profile_lastName", sanitizedLastName); //NOSONAR

        const sanitizedEmail = sanitizeEmail(email);
        sessionStorage.setItem("profile_email", sanitizedEmail); //NOSONAR

        const sanitizedPhone = sanitizeNumeric(phone);
        sessionStorage.setItem("profile_phone", sanitizedPhone); //NOSONAR

        const sanitizedIdNumber = sanitizeNumeric(idNumber);
        sessionStorage.setItem("profile_idNumber", sanitizedIdNumber); //NOSONAR

        const sanitizedNationality = sanitizeName(nationality);
        sessionStorage.setItem("profile_nationality", sanitizedNationality); //NOSONAR

        sessionStorage.setItem("profile_isAvailable", String(isAvailable)); //NOSONAR

        const sanitizeCurrency = (text: string) => text.replace(/[^0-9.]/g, "");
        const sanitizedCTC = sanitizeCurrency(costToCompany);
        sessionStorage.setItem("profile_costToCompany", sanitizedCTC); //NOSONAR


        console.log("Profile Info Saved:", {
            firstName,
            lastName,
            email,
            phone,
            idNumber,
            nationality,
            isAvailable,
            costToCompany: sanitizedCTC,
        });

        toast.success("Personal information saved successfully!");
    };

    return (
        <Card className="p-12 h-full w-full flex items-start justify-center">
            <div className="w-full max-w-[800px] flex flex-col h-full">
                <div className="h-6" />

                <h2 
                    className="text-3xl font-bold mb-8"
                    style={{ color: "var(--color-primary)" }}
                >
                    Personal Information
                </h2>
                <div className="h-6" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                    <div className="flex flex-col gap-3">
                        <label htmlFor="first-name" className="text-base font-semibold">First Name</label>
                        <Input 
                            id="first-name" 
                            placeholder="First Name" 
                            value={firstName} 
                            onChange={(e) => setFirstName(e.target.value)} 
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <label htmlFor="last-name" className="text-base font-semibold">Last Name</label>
                        <Input 
                            id="last-name" 
                            placeholder="Last Name" 
                            value={lastName} 
                            onChange={(e) => setLastName(e.target.value)} 
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <label htmlFor="email" className="text-base font-semibold">Email Address</label>
                        <Input 
                            id="email" 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (emailError) setEmailError("");
                            }}
                            placeholder="example@consultiq.com" 
                            className={emailError ? "border-red-500 focus-visible:ring-red-500" : ""}
                        />
                        {emailError && <span className="text-red-500 text-sm mt-1">{emailError}</span>}
                    </div>

                    <div className="flex flex-col gap-3">
                        <label htmlFor="phone" className="text-base font-semibold">Phone Number</label>
                        <Input 
                            id="phone" 
                            type="tel" 
                            pattern="\d{10}"
                            maxLength={10}
                            value={phone}
                            onChange={(e) => {
                                setPhone(e.target.value);
                                if (phoneError) setPhoneError("");
                            }}
                            title="Please enter a valid 10-digit phone number"
                            placeholder="0123456789" 
                            className={phoneError ? "border-red-500 focus-visible:ring-red-500" : ""}
                        />
                        {phoneError && <span className="text-red-500 text-sm mt-1">{phoneError}</span>}
                    </div>

                    <div className="flex flex-col gap-3">
                        <label
                            htmlFor="id-number"
                            className="text-base font-semibold"
                        >
                            ID Number
                        </label>

                        <Input
                            id="id-number"
                            pattern="\d{13}"
                            maxLength={13}
                            value={idNumber}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");

                                setIdNumber(value);

                                const validationError =
                                    validateSouthAfricanId(value);

                                setIdError(validationError);
                            }}
                            title="South African ID number must be exactly 13 digits"
                            placeholder="1234567890123"
                            className={
                                idError
                                    ? "border-red-500 focus-visible:ring-red-500"
                                    : ""
                            }
                        />

                        {idError && (
                            <span className="text-red-500 text-sm mt-1">
                                {idError}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        <label htmlFor="nationality" className="text-base font-semibold">Nationality</label>
                        <Input 
                            id="nationality" 
                            type="text" 
                            placeholder="South African" 
                            value={nationality}
                            onChange={(e) => {
                                setNationality(e.target.value);
                                if (nationalityError) setNationalityError("");
                            }}
                            className={nationalityError ? "border-red-500 focus-visible:ring-red-500" : ""}
                        />
                        {nationalityError && <span className="text-red-500 text-sm mt-1">{nationalityError}</span>}
                    </div>
                </div>
                <div className="h-6" />

                {/* Availability & Cost to Company */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Availability Toggle */}
                    <div className="flex flex-col gap-3">
                        <label className="text-base font-semibold">Availability</label>
                        <div className="flex items-center gap-4 h-10">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={isAvailable}
                                onClick={() => setIsAvailable((prev) => !prev)}
                                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                style={{
                                    backgroundColor: isAvailable ? "var(--color-accent)" : "#d1d5db",
                                }}
                            >
                                <span
                                    className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200"
                                    style={{
                                        transform: isAvailable ? "translateX(20px)" : "translateX(0px)",
                                    }}
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

                    {/* Cost to Company */}
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
                                onChange={(e) => {
                                    setCostToCompany(e.target.value);
                                    if (costError) setCostError("");
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "-") {
                                        e.preventDefault();
                                    }
                                }}
                                className={costError ? "border-red-500 focus-visible:ring-red-500" : ""}
                                style={{ paddingLeft: "2.5rem" }}
                            />
                        </div>
                        {costError && <span className="text-red-500 text-sm">{costError}</span>}
                    </div>
                </div>
                <div className="h-6" />

                <div className="mt-8 flex justify-end w-full">
                    <Button onClick={handleDone} className={`h-14 w-46 text-lg rounded font-semibold transition ${isFormValid ? "hover:brightness-110" : "bg-gray-50 hover:bg-gray-100"}`}
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