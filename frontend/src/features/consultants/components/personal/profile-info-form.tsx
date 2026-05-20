import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";

export default function ProfileInfoForm() {
    const [firstName, setFirstName] = useState(() => sessionStorage.getItem("profile_firstName") || "");
    const [lastName, setLastName] = useState(() => sessionStorage.getItem("profile_lastName") || "");
    const [email, setEmail] = useState(() => sessionStorage.getItem("profile_email") || "");
    const [phone, setPhone] = useState(() => sessionStorage.getItem("profile_phone") || "");
    const [idNumber, setIdNumber] = useState(() => sessionStorage.getItem("profile_idNumber") || "");
    const [nationality, setNationality] = useState(() => sessionStorage.getItem("profile_nationality") || "");
    const [isAvailable, setIsAvailable] = useState(() => sessionStorage.getItem("profile_isAvailable") === "true");
    const [costToCompany, setCostToCompany] = useState(() => sessionStorage.getItem("profile_costToCompany") || "");

    const handleDone = () => {
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
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@consultiq.com" 
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <label htmlFor="phone" className="text-base font-semibold">Phone Number</label>
                        <Input 
                            id="phone" 
                            type="tel" 
                            pattern="\d{10}"
                            maxLength={10}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            title="Please enter a valid 10-digit phone number"
                            placeholder="0123456789" 
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <label htmlFor="id-number" className="text-base font-semibold">ID Number</label>
                        <Input 
                            id="id-number" 
                            pattern="\d{13}"
                            maxLength={13}
                            value={idNumber}
                            onChange={(e) => setIdNumber(e.target.value)}
                            title="South African ID number must be exactly 13 digits"
                            placeholder="1234567890123" 
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <label htmlFor="nationality" className="text-base font-semibold">Nationality</label>
                        <Input 
                            id="nationality" 
                            placeholder="South African" 
                            value={nationality}
                            onChange={(e) => setNationality(e.target.value)}
                        />
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
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold select-none"
                                style={{ color: "var(--color-primary)" }}
                            >
                                R
                            </span>
                            <Input
                                id="cost-to-company"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={costToCompany}
                                onChange={(e) => setCostToCompany(e.target.value)}
                                className="pl-7"
                            />
                        </div>
                    </div>
                </div>
                <div className="mt-8 flex justify-end w-full">
                    <Button onClick={handleDone} className="h-16 w-48 text-lg rounded font-semibold transition bg-gray-50 hover:bg-gray-100"
                        style={{
                            color:
                                "var(--color-primary)",
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