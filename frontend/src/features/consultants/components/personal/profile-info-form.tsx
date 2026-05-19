import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";

const sanitizeInput = (input: string) => {
    if (!input) return "";
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/\//g, "&#x2F;");
};

export default function ProfileInfoForm() {
    const [firstName, setFirstName] = useState(() => sessionStorage.getItem("profile_firstName") || "");
    const [lastName, setLastName] = useState(() => sessionStorage.getItem("profile_lastName") || "");
    const [email, setEmail] = useState(() => sessionStorage.getItem("profile_email") || "");
    const [phone, setPhone] = useState(() => sessionStorage.getItem("profile_phone") || "");
    const [idNumber, setIdNumber] = useState(() => sessionStorage.getItem("profile_idNumber") || "");
    const [nationality, setNationality] = useState(() => sessionStorage.getItem("profile_nationality") || "");

    const handleDone = () => {
        sessionStorage.setItem("profile_firstName", sanitizeInput(firstName));
        sessionStorage.setItem("profile_lastName", sanitizeInput(lastName));
        sessionStorage.setItem("profile_email", sanitizeInput(email));
        sessionStorage.setItem("profile_phone", sanitizeInput(phone));
        sessionStorage.setItem("profile_idNumber", sanitizeInput(idNumber));
        sessionStorage.setItem("profile_nationality", sanitizeInput(nationality));

        console.log("Profile Info Saved:", {
            firstName,
            lastName,
            email,
            phone,
            idNumber,
            nationality,
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