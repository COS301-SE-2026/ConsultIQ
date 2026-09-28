import { ShieldCheck } from "lucide-react";

interface SecurityClearedModalProps {
    readonly onContinue: () => void;
}

export default function SecurityClearedModal({ onContinue }: SecurityClearedModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
            <div className="bg-white rounded-xl w-full max-w-lg border-2 border-green-300 shadow-xl" style={{ padding: "32px" }}>
                <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className="h-7 w-7 text-green-600 shrink-0" />
                    <h2 className="text-xl font-bold text-green-700">
                        Security review cleared
                    </h2>
                </div>
                <p className="text-sm text-gray-700 mb-6">
                    A super admin has reviewed this CV and cleared it. You can now edit the extracted details and proceed with creating this consultant's profile.
                </p>
                <button
                    className="w-full h-12 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition"
                    onClick={onContinue}
                >
                    Continue to review
                </button>
            </div>
        </div>
    );
}