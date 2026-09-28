// pages/security-review-modal.tsx
import { AlertTriangle } from "lucide-react";
import type { CvSecurityFlag, CvSecurityFlagType } from "../types/cv.types";

const FLAG_TYPE_LABELS: Record<CvSecurityFlagType, string> = {
    INSTRUCTION_OVERRIDE: "Attempted to override the extraction instructions",
    AUTHORITY_IMPERSONATION: "Attempted to impersonate a system message or administrator",
    DATA_EXFILTRATION_ATTEMPT: "Attempted to extract internal system information",
    HIDDEN_OR_OBFUSCATED_TEXT: "Contains hidden or obfuscated text",
    TOOL_USE_OR_EXTERNAL_REQUEST: "Attempted to trigger an external request",
    SCHEMA_MANIPULATION_ATTEMPT: "Attempted to inject unexpected data fields",
    OTHER_SUSPICIOUS_CONTENT: "Contains other suspicious content",
};

interface SecurityReviewModalProps {
    readonly status: "PENDING" | "REJECTED";
    readonly flags: CvSecurityFlag[];
    readonly onExit: () => void;
}

export default function SecurityReviewModal({ status, flags, onExit }: SecurityReviewModalProps) {
    const isRejected = status === "REJECTED";
    const uniqueFlagTypes = Array.from(new Set(flags.map((f) => f.flagType)));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
            <div className="bg-white rounded-xl w-full max-w-lg border-2 border-red-300 shadow-xl" style={{ padding: "32px" }}>
                <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="h-7 w-7 text-red-600 shrink-0" />
                    <h2 className="text-xl font-bold text-red-700">
                        {isRejected ? "This CV was rejected" : "This CV contains suspicious content"}
                    </h2>
                </div>

                <div className="flex flex-col gap-2 mb-6 max-h-64 overflow-y-auto">
                    {uniqueFlagTypes.map((flagType) => (
                        <div key={flagType} className="rounded-lg p-3 border bg-red-50 border-red-200">
                            <p className="text-sm font-semibold text-red-800">
                                {FLAG_TYPE_LABELS[flagType] ?? FLAG_TYPE_LABELS.OTHER_SUSPICIOUS_CONTENT}
                            </p>
                        </div>
                    ))}
                </div>

                <p className="text-sm text-gray-700 mb-6">
                    {isRejected
                        ? `Our AI detected ${flags.length === 1 ? "an attempt" : `${flags.length} attempts`} to manipulate how this CV was processed. It was rejected during security review, cannot be processed, and this decision cannot be reopened. If the consultant needs to reapply, a new CV upload will need to go through the review process again.`
                        : `Our AI detected ${flags.length === 1 ? "an attempt" : `${flags.length} attempts`} to manipulate how this CV was processed. It's awaiting security review by a super admin — editing and profile creation are paused until that's complete. You can find and view this consultant in your Flagged tab in the meantime; the extracted data shown there has already been checked and was not affected.`}
                </p>

                <button
                    className="w-full h-12 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition"
                    onClick={onExit}
                >
                    Exit to consultant list
                </button>
            </div>
        </div>
    );
}