import { useNavigate } from "react-router-dom";
import { ShieldOff, ArrowLeft } from "lucide-react";

function PopiaDeclineForm() {
  const navigate = useNavigate();

  return (
    <div
      className="w-full max-w-[980px] min-h-[720px] bg-white rounded-2xl border px-20 py-14 flex flex-col mx-auto my-12"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="flex flex-col items-center justify-center flex-1 gap-10 text-center">


        <div
          className="flex items-center justify-center w-24 h-24 rounded-full"
          style={{ backgroundColor: "var(--color-surface, #f5f5f5)" }}
        >
          <ShieldOff
            className="w-12 h-12"
            style={{ color: "var(--color-primary)" }}
            strokeWidth={1.5}
          />
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-4 max-w-[620px]">
          <h1
            className="text-4xl font-bold"
            style={{ color: "var(--color-primary)" }}
          >
            Consent Not Provided
          </h1>
          <p
            className="text-lg leading-8"
            style={{ color: "var(--color-text-secondary)" }}
          >
            You have chosen not to provide consent. Without consent, you cannot
            access this system.
          </p>
        </div>

        <div
          className="w-full max-w-[560px] border-t"
          style={{ borderColor: "var(--color-border)" }}
        />

        <div
          className="w-full max-w-[620px] rounded-xl px-8 py-6 text-left"
          style={{ backgroundColor: "var(--color-surface, #f9f9f9)", border: "1px solid var(--color-border)" }}
        >
          <p
            className="text-base leading-7"
            style={{ color: "var(--color-text-secondary)" }}
          >
            In accordance with POPIA regulations, access to ConsultIQ requires
            your consent to the collection, processing, and storage of your
            personal information. If you change your mind, you may return to the
            consent form at any time to review and accept the policy.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex justify-center gap-6 mt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 min-w-[220px] h-[56px] rounded-lg border font-bold text-lg transition bg-gray-50 hover:bg-gray-100"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-primary)",
            }}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Consent
          </button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="min-w-[220px] h-[56px] rounded-lg text-white font-bold text-lg transition hover:brightness-110"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            Return to Login
          </button>
        </div>

      </div>
    </div>
  );
}

export default PopiaDeclineForm;