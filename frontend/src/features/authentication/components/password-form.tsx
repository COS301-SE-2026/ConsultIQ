import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X } from "lucide-react";

interface PasswordFormProps {
  readonly email?: string;
  readonly token?: string;
  readonly title?: string;
  readonly description?: string;
  readonly submitLabel?: string;
  onSubmit: (payload: {readonly email?: string; readonly token?: string; readonly password: string}) => Promise<unknown>;
  readonly successRedirect?: string;
  readonly successMessage?: string;
}

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "At least one uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "At least one lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "At least one number", test: (p: string) => /\d/.test(p) },
  { label: "At least one special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function allRulesMet(password: string) {
  return passwordRules.every((rule) => rule.test(password));
} 

function PasswordForm({email, token, title= "Set Password",description= "Enter a secure password", submitLabel= "Set Password", onSubmit, successRedirect, successMessage}: PasswordFormProps) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string[]; confirmPassword?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const showChecklist = (passwordFocused || password.length > 0) && !confirmFocused && !allRulesMet(password);

  function validate() {
    const newErrors: { password?: string[]; confirmPassword?: string } = {};
    const passwordErrors: string[] = [];
    if (!password.trim()) passwordErrors.push("Password is required.");
    else if (password.length < 8) passwordErrors.push("Password must be at least 8 characters.");
    if (passwordErrors.length > 0) newErrors.password = passwordErrors;
    if (!confirmPassword.trim()) newErrors.confirmPassword = "Please confirm your password.";
    else if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match.";
    return newErrors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (!token || !email) {
      setSubmitError("Invalid activation link. Please request a new one.");
      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      await onSubmit({ email, token, password });
      setSuccess(true);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

    if (success) {
      if(successRedirect) setTimeout(() => navigate(successRedirect), 1200);

      return (
        <div className="flex flex-col w-[560px] min-h-[580px] bg-white rounded-lg shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] items-center justify-center gap-6 px-12 text-center">
          <h1 className="font-bold text-2xl" style={{ color: "var(--color-primary)" }}>
            Success
          </h1>
          <p style={{ color: "var(--color-text-secondary)" }}>
            {successMessage ?? "Your password was updated."}
          </p>
        </div>
      ); 
    }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col w-[560px] min-h-[580px] bg-white rounded-lg shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] items-center gap-6 pt-12 pb-10"
    >
      {/* Heading */}
      <div className="mb-4 w-full text-center">
        <h1 className="font-bold mb-3" style={{ color: "var(--color-primary)" }}>
          {title}
        </h1>
        <p className="text-base" style={{ color: "var(--color-text-secondary)" }}>
          {description}
        </p>
        {email && (
          <p className="text-sm mt-2" style={{ color: "var(--color-text-secondary)" }}>
            For <strong>{email}</strong>
          </p>
        )}
      </div >

      {/* Form Fields */}
      <div className="flex flex-col gap-6">
        {/* Password */}
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
            Password
          </label>
          <input
            type="password"
            id="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            className={`mx-auto w-96 max-w-[520px] h-[50px] px-4 rounded border text-base outline-none transition focus:ring-2 focus:ring-blue-100 ${errors.password ? "border-red-500" : "border-[#E2E8F0]"}`}
          />

          {/* Live checklist — hidden once all rules met or confirm field is focused */}
          {showChecklist && (
            <ul className="w-96 mt-1 flex flex-col gap-1">
              {passwordRules.map((rule) => {
                const met = rule.test(password);
                return (
                  <li key={rule.label} className="flex items-center gap-2 text-sm">
                    {met ? (
                      <Check size={14} className="text-green-500 shrink-0" />
                    ) : (
                      <X size={14} className="text-gray-300 shrink-0" />
                    )}
                    <span style={{ color: met ? "#22c55e" : "var(--color-text-secondary)" }}>
                      {rule.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {errors.password && errors.password.length > 0 && (
            <ul className="text-red-500 text-sm mt-1 list-disc list-inside">
              {errors.password.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-2">
          <label htmlFor="confirmPassword" className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onFocus={() => setConfirmFocused(true)}
            onBlur={() => setConfirmFocused(false)}
            className={`mx-auto w-96 max-w-[520px] h-[50px] px-4 rounded border text-base outline-none transition focus:ring-2 focus:ring-blue-100 ${errors.confirmPassword ? "border-red-500" : "border-[#E2E8F0]"}`}
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
          )}
        </div>
      </div>

      {submitError && (
        <p className="text-red-500 text-sm w-96 text-center">{submitError}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mx-auto w-96 max-w-[520px] h-[48px] mt-4 rounded text-white font-bold text-base transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        {loading ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

export default PasswordForm;