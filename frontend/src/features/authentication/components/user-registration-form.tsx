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
            newErrors.email = "Email is required.";
        } else if (!email.trim()) {
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
            onSubmit={handleSubmit}
            style={{
                width: "460px",
                backgroundColor: "white",
                padding: "40px",
                borderRadius: "18px",
                boxShadow:  "0 8px 24px rgba(0,0,0,0.08)",
                display: "flex",
                flexDirection: "column",
                gap: "22px",
            }}
        >
            {/* Full Name */}
            <div>
                <h2 style={{
                    color: "var(--color-primary)",
                    marginBottom: "6px",
                }}>
                    User Details
                </h2>
                <p style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "14px",
                }}>
                    Complete the fields below to register a new user.
                </p>
             </div>  
                <div> 

                <label htmlFor="fullName"
                style={{ 
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                    color: "var(--color-primary)",
                 }}
                >
                    Full Name
                </label>
                <input
                    type="text"
                    id="fullName"
                    placeholder="Enter full name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: "10px",
                        border: errors.fullName ? "1.5px solid #e74c3c" : "1px solid var(--color-border)",
                        fontSize: "15px",
                    }}
                />
                {errors.fullName && (
                    <div style={{ color: "#e74c3c", fontSize: 13, marginTop: 4 }}>{errors.fullName}</div>
                )}
            </div>

            {/* Email */}
            <div>
                <label htmlFor="email"
                style={{ 
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                 }}
                >
                    Email Address
                </label>
                <input
                    type="email"
                    id="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: "10px",
                        border: errors.email ? "1.5px solid #e74c3c" : "1px solid var(--color-border)",
                        fontSize: "15px",
                    }}
                />
                {errors.email && (
                    <div style={{ color: "#e74c3c", fontSize: 13, marginTop: 4 }}>{errors.email}</div>
                )}
            </div>

            {/* Role */}
            <div>
                <label htmlFor="role"
                style={{ 
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                 }}
                >
                    Role
                </label>
                
                <select
                    id="role"
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    disabled={isRoleLocked}
                    style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: "10px",
                        border: errors.role ? "1.5px solid #e74c3c" : "1px solid var(--color-border)",
                        fontSize: "15px",
                        backgroundColor: "white",
                    }}
                >
                    {allowedRoles.map((role) => (
                        <option
                            key={role}
                            value={role}
                        >
                            {role.replaceAll("_", " ")}
                        </option>
                    ))}
                </select>
                {errors.role && (
                    <div style={{ color: "#e74c3c", fontSize: 13, marginTop: 4 }}>{errors.role}</div>
                )}
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                style={{
                    marginTop: "8px",
                    backgroundColor: "var(--color-primary)",
                    color: "white",
                    padding: "15px",
                    fontWeight: 600,
                    borderRadius: "10px",
                    border: "none",
                    fontSize: "15px",
                    cursor: "pointer",
                }}
            >
                Register User
            </button>

         </form>
    );

}

export default UserRegistrationForm;