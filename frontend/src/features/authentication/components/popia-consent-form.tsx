import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { acceptTerms } from "../../../api/auth.api";

function PopiaConsentForm() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const navigate = useNavigate();

  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accepted) return;

    setLoading(true);
    setError(null);

    try {
      await acceptTerms(email);
      navigate("/login");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleDecline() {
    navigate("/login");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[980px] min-h-[720px] bg-white rounded-2xl border px-20 py-14 flex flex-col mx-auto my-12"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="flex flex-col gap-6">
        <div className="flex justify-center mb-8">
          <div className="w-[115px]" />
        </div>

        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-4xl font-bold mb-4" style={{ color: "var(--color-primary)" }}>
            Welcome to ConsultIQ
          </h1>
          <p className="text-lg" style={{ color: "var(--color-text-secondary)" }}>
            Before we proceed, please read and accept our POPIA consent policy.
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="w-full max-h-[420px] overflow-y-auto px-6 flex flex-col items-center gap-6">
          {/* User Rights Section */}
          <div className="w-full max-w-[760px]">
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--color-primary)" }}>
              User Rights
            </h2>
            <p className="text-lg leading-8" style={{ color: "var(--color-text-secondary)" }}>
              In accordance with the Protection of Personal Information Act (POPIA), you have the right to
              access, update, and request deletion of your personal information. ConsultIQ is committed to ensuring
              transparency in how your information is collected, processed, and stored within the system.
            </p>
          </div>

          {/* Information Usage Section */}
          <div className="w-full max-w-[760px]">
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--color-primary)" }}>
              Information Usage
            </h2>
            <p className="text-lg leading-8" style={{ color: "var(--color-text-secondary)" }}>
              Your information will be used solely for consultant management, project placement, communication,
              and platform-related operations. ConsultIQ will never sell or distribute your personal information
              to unauthorized third parties.
            </p>
          </div>

          {/* Data Security Section */}
          <div className="w-full max-w-[760px]">
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--color-primary)" }}>
              Data Security
            </h2>
            <p className="text-lg leading-8" style={{ color: "var(--color-text-secondary)" }}>
              ConsultIQ applies industry standard security measures to protect all personal and operational data.
              Access to sensitive information is restricted based on role-based access controls, and all data is
              encrypted and securely stored.
            </p>
          </div>

          {/* Consent Agreement Section */}
          <div className="w-full max-w-[760px]">
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--color-primary)" }}>
              Consent Agreement
            </h2>
            <p className="text-lg leading-8" style={{ color: "var(--color-text-secondary)" }}>
              By accepting this policy, you consent to the collection, processing, and storage of your personal
              information as outlined above and in accordance with POPIA regulations.
            </p>
          </div>
        </div>

        <div className="w-full mt-0 px-6 flex flex-col items-center gap-6">
          {/* Checkbox + Label */}
          <div className="flex items-start justify-center gap-4 max-w-[760px]">
            <input
              type="checkbox"
              id="consent"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="w-5 h-5 mt-1 accent-[var(--color-primary)] shrink-0"
            />
            <label
              htmlFor="consent"
              className="text-base leading-7 flex-1"
              style={{ color: "var(--color-text-primary)" }}
            >
              I acknowledge that I have read and understood the POPIA consent policy
              and consent to the processing of my personal information in accordance
              with applicable regulations.
            </label>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          {/* Buttons */}
          <div className="flex justify-center gap-6 mt-6">
            <button
              type="submit"
              disabled={!accepted || loading}
              className="min-w-[220px] h-[56px] rounded-lg text-white font-bold text-lg transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {loading ? "Saving..." : "Accept & Continue"}
            </button>

            <button
              type="button"
              onClick={handleDecline}
              className="min-w-[220px] h-[56px] rounded-lg border font-bold text-lg transition bg-gray-50 hover:bg-gray-100"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default PopiaConsentForm;