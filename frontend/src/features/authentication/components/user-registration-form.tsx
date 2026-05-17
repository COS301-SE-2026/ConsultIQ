import type { UserRole } from "../../../types/global.types";

interface UserRegistrationFormProps {
    readonly allowedRoles: UserRole[];
}

import { useState } from "react";

function UserRegistrationForm({ allowedRoles }: UserRegistrationFormProps) {
    const isRoleLocked = allowedRoles.length === 1;

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState(allowedRoles[0] || "");
    const [errors, setErrors] = useState<{ fullName?: string; email?: string; role?: string }>({});

    function validate() {
        const newErrors: { fullName?: string; email?: string; role?: string } = {};
        if (!fullName.trim()) newErrors.fullName = "Full name is required.";
        if (!email.trim()) {
            newErrors.email = "Email is required.";}
        if (!role) newErrors.role = "Role is required.";
        return newErrors;
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const validationErrors = validate();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;
        // Submit logic here
        alert("User registered successfully! (Demo only)");
    }

    return (
    <form
        onSubmit={handleSubmit} className="w-[560px] h-[560px] bg-white px-12 rounded-2xl shadow-2xl flex flex-col items-center justify-center gap-6"    >
        {/* Header */}
        <div className="mb-8 w-full text-center">
            <h2
                className="text-3xl font-bold mb-3"
                style={{ color: "var(--color-primary)" }}
            >
                User Details
            </h2>

            <p
                className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Complete the fields below to register a new user.
            </p>
        </div>

        <div className="flex flex-col gap-8 w-full items-center">
            {/* Full Name */}
            <div className="flex flex-col gap-2 w-full items-center">
                <label
                    htmlFor="fullName"
                    className="font-semibold text-base w-96"
                    style={{ color: "var(--color-primary)" }}
                >
                    Full Name
                </label>

                <input
                    type="text"
                    id="fullName"
                    placeholder="Enter full name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className={`w-96 px-5 py-4 min-h-[52px] rounded-xl text-base border outline-none transition ${
                        errors.fullName ? "border-red-500" : "border-gray-200"
                    }`}
                />

                {errors.fullName && (
                    <div className="text-red-500 text-sm mt-1 w-96">
                        {errors.fullName}
                    </div>
                )}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2 w-full items-center">
                <label
                    htmlFor="email"
                    className="font-semibold text-base w-96"
                    style={{ color: "var(--color-primary)" }}
                >
                    Email Address
                </label>

                <input
                    type="email"
                    id="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={`w-96 px-5 py-4 min-h-[52px] rounded-xl text-base border outline-none transition ${
                        errors.email ? "border-red-500" : "border-gray-200"
                    }`}
                />

                {errors.email && (
                    <div className="text-red-500 text-sm mt-1 w-96">
                        {errors.email}
                    </div>
                )}
            </div>

            {/* Role */}
            <div className="flex flex-col gap-2 w-full items-center">
                <label
                    htmlFor="role"
                    className="font-semibold text-base w-96"
                    style={{ color: "var(--color-primary)" }}
                >
                    Role
                </label>

                <select
                    id="role"
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    disabled={isRoleLocked}
                    className={`w-96 px-5 py-4 min-h-[52px] rounded-xl text-base border bg-white outline-none transition ${
                        errors.role ? "border-red-500" : "border-gray-200"
                    }`}
                >
                    {allowedRoles.map((role) => (
                        <option key={role} value={role}>
                            {role.replaceAll("_", " ")}
                        </option>
                    ))}
                </select>

                {errors.role && (
                    <div className="text-red-500 text-sm mt-1 w-96">
                        {errors.role}
                    </div>
                )}
            </div>
        </div>

        {/* Submit Button */}
        <button
            type="submit"
            className="w-96 px-5 py-4 min-h-[52px] rounded-xl text-white font-semibold text-lg transition hover:opacity-90"
            style={{ backgroundColor: "var(--color-accent)" }}
        >
            Register User
        </button>
    </form>
    );

}

export default UserRegistrationForm;