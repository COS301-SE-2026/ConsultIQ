import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { activateAccount } from "../../../api/auth.api";

function SetPasswordForm() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate() {
    const newErrors: { password?: string; confirmPassword?: string } = {};
    if (!password.trim()) newErrors.password = "Password is required.";
    else if (password.length < 8) newErrors.password = "Password must be at least 8 characters.";
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
      await activateAccount({ email, token, password });
      setSuccess(true);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col w-[560px] min-h-[580px] bg-white rounded-lg shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] items-center justify-center gap-6 px-12 text-center">
        <h1 className="font-bold text-2xl" style={{ color: "var(--color-primary)" }}>
          Account Activated!
        </h1>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Your password has been set successfully. You can now log in.
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
      <div className="mb-8 w-full text-center">
        <h1 className="font-bold mb-3" style={{ color: "var(--color-primary)" }}>
          Welcome to ConsultIQ
        </h1>
        <p className="text-base" style={{ color: "var(--color-text-secondary)" }}>
          Create your password to activate your account.
        </p>
        {email && (
          <p className="text-sm mt-2" style={{ color: "var(--color-text-secondary)" }}>
            Setting password for <strong>{email}</strong>
          </p>
        )}
      </div>

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
            className={`mx-auto w-96 max-w-[520px] h-[50px] px-4 rounded border text-base outline-none transition focus:ring-2 focus:ring-blue-100 ${errors.password ? "border-red-500" : "border-[#E2E8F0]"}`}
          />
          {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
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
            className={`mx-auto w-96 max-w-[520px] h-[50px] px-4 rounded border text-base outline-none transition focus:ring-2 focus:ring-blue-100 ${errors.confirmPassword ? "border-red-500" : "border-[#E2E8F0]"}`}
          />
          {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword}</p>}
        </div>
      </div>

      {submitError && (
        <p className="text-red-500 text-sm text-center w-96">{submitError}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mx-auto w-96 max-w-[520px] h-[48px] mt-10 rounded text-white font-bold text-base transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
        style={{ backgroundColor: "var(--color-accent)" }}
      >
        {loading ? "Activating..." : "Set Password"}
      </button>
    </form>
  );
}

export default SetPasswordForm;