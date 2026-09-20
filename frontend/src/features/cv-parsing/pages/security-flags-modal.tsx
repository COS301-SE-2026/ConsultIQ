import { AlertTriangle } from "lucide-react";
import type { CvSecurityFlag, CvSecurityFlagType } from "../types/cv.types";


const FLAG_TYPE_LABELS: Record<CvSecurityFlagType, string> = {
    INSTRUCTION_OVERRIDE: "Attempted to override the extraction instructions",
    AUTHORITY_IMPERSONATION: "Attempted to impersonate a system message or administrator",
    DATA_EXFILTRATION_ATTEMPT: "Attempted to extract internal system information",
    HIDDEN_OR_OBFUSCATED_TEXT: "Contains hidden or obfuscated text",
    TOOL_USE_OR_EXTERNAL_REQUEST: "Attempted to trigger an external request",
    SCHEMA_MANIPULATION_ATTEMPT: "Attempted to inject unexpected data fields",
    OTHER_SUSPICIOUS_CONTENT: "Contains other suspicious content — review the excerpt below",
};

interface SecurityFlagsModalProps {
    readonly flags: CvSecurityFlag[];
    readonly onAcknowledge: () => void;
}

export default function SecurityFlagsModal({ flags, onAcknowledge }: SecurityFlagsModalProps) {
    if (flags.length === 0) return null;

    return (
        console.log("Rendering SecurityFlagsModal with flags:", flags),
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
            <div className="bg-white rounded-xl w-full max-w-lg border-2 border-red-300 shadow-xl" style={{ padding: "32px" }}>
                <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="h-7 w-7 text-red-600 shrink-0" />
                    <h2 className="text-xl font-bold text-red-700">
                        This CV contains suspicious content
                    </h2>
                </div>
                <p className="text-sm text-gray-700 mb-4">
                    Our AI detected {flags.length === 1 ? "an attempt" : `${flags.length} attempts`} to manipulate how this CV was processed. The extracted data shown after this has already been checked and was not affected — please review what was found before continuing.
                </p>
                <div className="flex flex-col gap-3 mb-6 max-h-64 overflow-y-auto">
                    {flags.map((flag, i) => (
                        <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm font-semibold text-red-800">
                                {FLAG_TYPE_LABELS[flag.flagType] ?? FLAG_TYPE_LABELS.OTHER_SUSPICIOUS_CONTENT}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Found in: {flag.field}</p>
                            <p className="text-sm text-gray-800 mt-2 italic">"{flag.excerpt}"</p>
                        </div>
                    ))}
                </div>
                <button
                    className="w-full h-12 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition"
                    onClick={onAcknowledge}
                >
                    I understand, continue to review
                </button>
            </div>
        </div>
    );
}